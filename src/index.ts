
import { ExecutionContext } from "@cloudflare/workers-types";
import { validateAndTransformData } from './transformers/jsonProcess';
import { Quantities, serializeToJsonL } from './transformers/serializeToJsonL';
import { BulkOperationResponse, Env, InventoryAdjustment } from './interfaces';
import { authorizeRequest } from './authentication/auth';
import { StoreInitializer, getStoreDetails } from './handlers/storeDetails';
import { Router, error, json} from 'itty-router';
import { StoreDetails, UpdateInventoryQuantities } from "./transformers/updateInventory";


import moment from "moment";






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
    let truncated = listing.truncated
    let cursor = truncated ? listing.cursor : undefined

    while(truncated) {
        const next = await env.MY_BUCKET.list({ ...options, cursor })
        listing.objects.push(...next.objects)
        truncated = next.truncated;
        cursor  = next.cursor;
    }
    listing.objects.sort((a, b) => new Date(b.uploaded as string).getTime() - new Date(a.uploaded as string).getTime());

    return new Response(JSON.stringify(listing), {headers: {
        'content-type': 'application/json; charset=UTF-8', 
      }})
});


router.get('/inventory/:store/:name', async (request, env) => {
    const {store, name } = request.params;
    if (!name) {
        return new Response('Missing file name', { status: 403 });
    }
   
    const file = await  env.MY_BUCKET.get(`${name}`, { type: 'json' });
    if (!file) {
        return new Response('No file found', { status: 404 });
    }
    const headers = new Headers();
    headers.set('etag', file.etag);
    headers.set('uploaded', file.uploaded)
    headers.set('customMetadata', JSON.stringify(file.customMetadata))

    return new Response(file.body, { headers: headers });
});
const corsHeaders = {
    'Access-Control-Allow-Headers': '*', // What headers are allowed. * is wildcard. Instead of using '*', you can specify a list of specific headers that are allowed, such as: Access-Control-Allow-Headers: X-Requested-With, Content-Type, Accept, Authorization.
    'Access-Control-Allow-Methods': 'POST, GET', // Allowed methods. Others could be GET, PUT, DELETE etc.
    'Access-Control-Allow-Origin': '*', // This is URLs that are allowed to access the server. * is the wildcard character meaning any URL can.
  }

router.options('*', () => new Response('OK', { status: 200, headers: corsHeaders }));
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
        
        const { processCount, invalidCount, jsonl, historyRef } = await processDataForPriceCorrectionJsonL(request, postedData, storeContext);
       //console.log('jsonl', jsonl);
        const fileUploadName = 'bulk_op_vars'
        const inventoryUpdate = new UpdateInventoryQuantities(storeContext, fileUploadName);
     
        const currentTime = moment().format('DD-MM-YYYYTHH-mm-ss');
        const fileName = `${storeContext.storeUrl}-inventory-update-${currentTime}.json`;
        

        const bulkOperation = await sendBulkMutationToShopify(inventoryUpdate, jsonl);
        const body = {
            transaction: historyRef,
            errors: bulkOperation.data.inventorySetOnHandQuantities.userErrors,
        }
        const object = await env.MY_BUCKET.put(fileName, JSON.stringify(body), {
            customMetadata: {
                region: region,
                productCount: processCount,
                errors: bulkOperation.data.inventorySetOnHandQuantities.userErrors.length
            }
          
        })
        console.log('object', JSON.stringify(object));
        const userErrors = bulkOperation.data.inventorySetOnHandQuantities.userErrors;
        if (userErrors?.length) {
            return new Response(JSON.stringify(userErrors), {
                status: 400, 
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const responseObject = {
            processCount: processCount,
            invalidCount: invalidCount,
            InventoryUpdate: bulkOperation,

        };

        return new Response(JSON.stringify(responseObject), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error(error); 
        return new Response('Error processing data', { status: 500 });
    }
});


router.all('*', () => error(404))



export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        let response: Response;
        if (!authorizeRequest(request, env)) { response = new Response('Unauthorized', { status: 401 }); return response; }
        return router.handle(request, env, ctx);
    },


};


async function sendBulkMutationToShopify(inventoryUpdate: UpdateInventoryQuantities, jsonl: any): Promise<InventoryAdjustment> {
    const bulkOperation = await inventoryUpdate.sendBulkMutation(jsonl);
    if (bulkOperation == null) {
        throw new Error('Error sending bulk mutation');
    }
    return bulkOperation;

}


async function processDataForPriceCorrectionJsonL(request: Request, postedData: any[], storeContext: StoreDetails) {

    if (!Array.isArray(postedData)) {
        throw new Error("Posted data must be an array");
    }
    try {
        const processedData = await validateAndTransformData(postedData, storeContext);

        const quantitiesArray = processedData.valid.map(product => {
            const productQuantities = product.stock.map(stockItem => ({
                locationId: stockItem.locationId,
                inventoryItemId: stockItem.inventoryItemId,
                quantity: stockItem.available
            }));

            
            //add compare here

          
            return new Quantities('correction', productQuantities);
        });



        const historyRef = processedData.valid.map((product, index) => ({
            index,
            inventoryItemId: product.stock.map(stockItem => stockItem.inventoryItemId),
            displayName: product.displayName,
            productID: product.ShopifyProductId,
            variantID: product.ShopifyVariantId,
            variantUrl: `https://${storeContext.storeUrl}.myshopify.com/admin/products/${product.ShopifyProductId}/variants/${product.ShopifyVariantId}`,// ` https://${storeUrl}.myshopify.com/admin/products/${product.ShopifyProductId}/variants/${product.ShopifyVariantId}`
            urlReferences: `https://${storeContext.storeUrl}${product.stock.map(stockItem => stockItem.historyUrl)}/inventory_history`
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






