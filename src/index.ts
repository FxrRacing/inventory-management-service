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

//TODO: Init the stageupload function with the gid instead of the url 



const router = Router();

router.get('/', () => new Response('Hello worker!'));



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
       const  { processCount, invalidCount, jsonl } = await processDataForPriceCorrectionJsonL(request, postedData);
		
		const fileUploadName= 'bulk_op_vars'
		const inventoryUpdate = new UpdateInventoryQuantities(storeContext, fileUploadName);
		// const stageUploadResult = await inventoryUpdate.stageUpload();
		// if (stageUploadResult == null) {
		// 	throw new Error('Error staging upload');
		// }
		// const { url, dataParams } = stageUploadResult;
			
		// const urlUploadPath = await inventoryUpdate.uploadFile(url, dataParams, jsonl);
		// console.log('urlUploadPath', urlUploadPath);
		// the mutation to shopify is then made 
		const bulkOperation = await sendBulkMutationToShopify(inventoryUpdate,jsonl) ;
		const responseObject = {
			processCount: processCount,
			invalidCount: invalidCount,
			bulkOperationId: bulkOperation,
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


async function processDataForPriceCorrectionJsonL( request: Request, postedData: any[]){
	
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
		
        const jsonl = serializeToJsonL(quantitiesArray);
        const processCount = processedData.valid.length;
        const invalidCount = processedData.invalid.length;
		
        return { processCount, invalidCount, jsonl };
    } catch (error) {
		console.error('Error:', error); 
        throw new Error("Error processing data");
    }
}


//TODO: Continue to make the mutation to shopify 


