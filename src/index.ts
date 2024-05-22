
import { ExecutionContext } from "@cloudflare/workers-types";
import { validateAndTransformData } from './transformers/jsonProcess';
import { Quantities, serializeToJsonL } from './transformers/serializeToJsonL';
import { BulkOperationResponse, Env } from './interfaces';
import { authorizeRequest } from './authentication/auth';
import { StoreInitializer, getStoreDetails } from './handlers/storeDetails';
import { Router, error, json} from 'itty-router';
import { UpdateInventoryQuantities } from "./transformers/updateInventory";


import moment from "moment";
import { createCard, notifyTeams } from "./utils";






const router = Router();

router.get('/', () => new Response('Hello worker!'));
router.get('/hi',async (request, env) => {
    const currentTime = moment().format('DD-MM-YYYYTHH-mm-ss');
    return new Response(`Hello worker! ${currentTime}`);
});

router.get('/inventory/:store', async (request, env) => {
    const { store } = request.params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const options: R2ListOptions = {
        limit: limit,
        prefix: store ?? undefined,
        delimiter: url.searchParams.get('delimiter') ?? undefined,
        cursor: url.searchParams.get('cursor') ?? undefined,
        include: ['customMetadata', 'httpMetadata'],
      }
   
   //🍀💻🔥
   
    const listing = await env.MY_BUCKET.list(options);
    
    return new Response(JSON.stringify(listing), {headers: {
        'content-type': 'application/json; charset=UTF-8', 
      }})
});


router.get('/inventory/:store/:name', async (request, env) => {
    const {store, name } = request.params;
    if (!name) {
        return new Response('Missing file name', { status: 400 });
    }
   
    const file = await  env.MY_BUCKET.get(`${name}`, { type: 'json' });
    if (!file) {
        return new Response('No file found', { status: 404 });
    }
    return new Response(file.body, { headers: { 'Content-Type': 'application/json' } });
});



router.post('/inventory/:region', async (request, env) => {
   
    const { region } = request.params; 
    console.log(`Initializing store for region: ${region}`); 
	const storeInitializer = new StoreInitializer(request, env, region); 

    const storeContext = storeInitializer.initializeStoreContext();

    if (!storeContext) {
        console.error('Invalid store context for region:', region);
        return new Response('Invalid store, are you making up regions?', { status: 400 });
    }


	try {
        const postedData = await request.json() as any[]; 
		console.log('Processing data for region:', region); 
       const  { processCount, invalidCount, jsonl,  historyRef } = await processDataForPriceCorrectionJsonL(request, postedData, storeContext.storeUrl, env);
		
		const fileUploadName= 'bulk_op_vars'
		const inventoryUpdate = new UpdateInventoryQuantities(storeContext, fileUploadName);
		// const stageUploadResult = await inventoryUpdate.stageUpload();
		// if (stageUploadResult == null) {
		// 	throw new Error('Erreor staging upload');
		// }
		// const { url, dataParams } = stageUploadResult;
			
		// const urlUploadPath = await inventoryUpdate.uploadFile(url, dataParams, jsonl);
		// console.log('urlUploadPath', urlUploadPath);
		// the mutation to shopify is then made 
      // console.log("this is our jsonl ",jsonl)
      const currentTime = moment().format('DD-MM-YYYYTHH-mm-ss');
      const fileName = `${storeContext.storeUrl}-inventory-update-${currentTime}.json`;
      console.log('fileName', fileName);
        const object = await env.MY_BUCKET.put(fileName, JSON.stringify(historyRef), {
            httpMetadata: request.headers,
          })
          console.log('object', object);
		const bulkOperation = await sendBulkMutationToShopify(inventoryUpdate,jsonl) ;
		const responseObject = {
			processCount: processCount,
			invalidCount: invalidCount,
			InventoryUpdate: bulkOperation,
          
		};
		
		return new Response(JSON.stringify(responseObject), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error(error); // Don't just stand there, log the error
        return new Response('Error processing data', { status: 500 });
    }
});


router.all('*', () => error(404))



export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        let response: Response;
		if (!authorizeRequest(request, env)) {response = new Response('Unauthorized', { status: 401 });return response;}
		return router.handle(request, env, ctx);
    },
	
	
};


async function sendBulkMutationToShopify( inventoryUpdate: UpdateInventoryQuantities,  jsonl: any){
	const bulkOperation = await inventoryUpdate.sendBulkMutation(jsonl) ;
	return bulkOperation;

}


async function processDataForPriceCorrectionJsonL( request: Request, postedData: any[], storeUrl: string, env: Env){
	
	if (!Array.isArray(postedData)) {
        throw new Error("Posted data must be an array"); 
    }
	try {
        const processedData = await validateAndTransformData(postedData);

        const quantitiesArray = processedData.valid.map(product => {
            const productQuantities = product.stock.map(stockItem => ({
                locationId: stockItem.locationId,
                inventoryItemId: stockItem.inventoryItemId,
                quantity: stockItem.available
            }));

            // 'correction' here represents the reason for price change
            return new Quantities('correction', productQuantities);
        });
        
       
      
        const historyRef = processedData.valid.map(product => ({
            productID: product.ShopifyVariantId,
            variantID: `https://${storeUrl}.myshopify.com/admin/products/${product.ShopifyProductId}/variants/${product.ShopifyVariantId}.json`,// ` https://${storeUrl}.myshopify.com/admin/products/${product.ShopifyProductId}/variants/${product.ShopifyVariantId}`
            urlReferences: `https://${storeUrl}${product.stock.map(stockItem => stockItem.historyUrl)}/inventory_history`
        }));
        const jsonl = serializeToJsonL(quantitiesArray);
        const processCount = processedData.valid.length;
        const invalidCount = processedData.invalid.length;
        const errFileName= `${storeUrl}-inventory-error-${normalTime()}.json`
        const uploadErrorData = await storeErrorData(env, errFileName, processedData.invalid);
        const buildCard = createCard(`${invalidCount} product(s) failed validation, view the products here`,storeUrl,errFileName);
        const teamsNotification  = await notifyTeams(JSON.stringify(buildCard), env);
        console.log('Teams notification:', teamsNotification);
		console.log('Error data upload status:', uploadErrorData);
        return { processCount, invalidCount, jsonl, historyRef };
    } catch (error) {
		console.error('Error:', error); 
        throw new Error("Error processing data");
    }
}

async function storeErrorData( env: Env, errFileName: string, errorData: any): Promise<string>{
    const object= await env.MY_BUCKET.put(errFileName, JSON.stringify(errorData))
    if (object) {
        return 'Error data stored';
    }
    return 'Error storing data';
   
   

}

function normalTime(){
    const current = new Date();
    const day = current.getDate();
    const month = current.getMonth();
    const year = current.getFullYear();
    const hour = current.getHours();
    const minute = current.getMinutes();
    const second = current.getSeconds();
    const time = `${day}-${month}-${year}T${hour}-${minute}-${second}`;
    return time;
}

//TODO: Continue to make the mutation to shopify 


