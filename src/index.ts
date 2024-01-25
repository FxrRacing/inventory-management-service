/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { ExecutionContext } from "@cloudflare/workers-types";
import { validateAndTransformData } from './transformers/jsonProcess';
import { Quantities, serializeToJsonL } from './transformers/serializeToJsonL';
import { BulkOperationResponse, Env } from './interfaces';
import { authorizeRequest } from './authentication/auth';
import { StoreInitializer, getStoreDetails } from './handlers/storeDetails';
import { Router, error, json} from 'itty-router';
import { UpdateInventoryQuantities } from "./transformers/updateInventory";
import { hi, id } from "date-fns/locale";

//TODO: Init the stageupload function with the gid instead of the url 



const router = Router();

router.get('/', () => new Response('Hello worker!'));

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
    // Wow, extracting params, such skill
    const { region } = request.params; // Look at you, using destructuring

    console.log(`Initializing store for region: ${region}`); // Logging, so advanced
	const storeInitializer = new StoreInitializer(request, env, region); // Finally using the region, slow clap

    const storeContext = storeInitializer.initializeStoreContext();

    if (!storeContext) {
        console.error('Invalid store context for region:', region);
        return new Response('Invalid store, are you making up regions?', { status: 400 });
    }


	try {
        const postedData = await request.json() as any[]; 
		console.log('Processing data for region:', region); 
       const  { processCount, invalidCount, jsonl,  historyRef } = await processDataForPriceCorrectionJsonL(request, postedData, storeContext.storeUrl);
		
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
        const currentTime = new Date().toISOString();
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
		//if (!authorizeRequest(request, env)) {response = new Response('Unauthorized', { status: 401 });return response;}
		return router.handle(request, env, ctx);
    },
	
	
};


async function sendBulkMutationToShopify( inventoryUpdate: UpdateInventoryQuantities,  jsonl: any){
	const bulkOperation = await inventoryUpdate.sendBulkMutation(jsonl) ;
	return bulkOperation;

}


async function processDataForPriceCorrectionJsonL( request: Request, postedData: any[], storeUrl: string){
	
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
            variantID: `https://${storeUrl}.myshopify.com/admin/products/${product.ShopifyProductId}/variants/${product.ShopifyVariantId}.json`,// ` https://${storeUrl}.myshopify.com/admin/products/${product.ShopifyProductId}/variants/${product.ShopifyVariantId}`
            urlReferences: `https://${storeUrl}${product.stock.map(stockItem => stockItem.historyUrl)}/inventory_history`
        }));
        const jsonl = serializeToJsonL(quantitiesArray);
        const processCount = processedData.valid.length;
        const invalidCount = processedData.invalid.length;

		
        return { processCount, invalidCount, jsonl, historyRef };
    } catch (error) {
		console.error('Error:', error); 
        throw new Error("Error processing data");
    }
}


//TODO: Continue to make the mutation to shopify 


