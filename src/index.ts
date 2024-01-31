
import { ExecutionContext } from "@cloudflare/workers-types";
import { validateAndTransformData } from './transformers/jsonProcess';
import { Quantities, serializeToJsonL } from './transformers/serializeToJsonL';
import { BulkOperationResponse, Env, InventoryAdjustment } from './interfaces';
import { authorizeRequest } from './authentication/auth';
import { StoreInitializer, getStoreDetails } from './handlers/storeDetails';
import { Router, error, json} from 'itty-router';
import { UpdateInventoryQuantities } from "./transformers/updateInventory";
import { hi, id } from "date-fns/locale";

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
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
    const options: R2ListOptions = {
        limit: limit,
        prefix: store ?? undefined,
        delimiter: url.searchParams.get('delimiter') ?? undefined,
        cursor: url.searchParams.get('cursor') ?? undefined,
        include: ['customMetadata', 'httpMetadata'],
      }
   
   //🍀💻🔥
   
    const listing = await env.MY_BUCKET.get(options);
    
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
    headers.set('customMetadata', JSON.stringify(file.customMetadata))

    return new Response(file.body, { headers: headers });
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
    
        const { processCount, invalidCount, jsonl, historyRef } = await processDataForPriceCorrectionJsonL(request, postedData, storeContext.storeUrl);

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


async function processDataForPriceCorrectionJsonL(request: Request, postedData: any[], storeUrl: string) {

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

          
            return new Quantities('correction', productQuantities);
        });



        const historyRef = processedData.valid.map(product => ({
            displayName: product.displayName,
            productID: product.ShopifyVariantId,
            variantID: `https://${storeUrl}.myshopify.com/admin/products/${product.ShopifyProductId}/variants/${product.ShopifyVariantId}`,// ` https://${storeUrl}.myshopify.com/admin/products/${product.ShopifyProductId}/variants/${product.ShopifyVariantId}`
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



