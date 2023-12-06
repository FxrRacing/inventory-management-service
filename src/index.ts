/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { Router } from './router';
import { ExecutionContext } from "@cloudflare/workers-types";
import { jsonProcess } from './transformers/jsonProcess';
import { Quantities, serializeToJsonL } from './transformers/serializeToJsonL';
import { Env } from './interfaces';
import { authorizeRequest } from './authentication/auth';
import { StoreInitializer, getStoreDetails } from './handlers/storeDetails';

//TODO: Init the stageupload function with the gid instead of the url 









export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		let response 

		//if (!authorizeRequest(request, env)) {response = new Response('Unauthorized', { status: 401 });return response;}
		//this needs to be rewritten  to use router instead 
		//
		const storeInitializer = new StoreInitializer(request, env);
		const storeContext = storeInitializer.initializeStoreContext();
		
		/**
		 * validate that store is valid
		 */
		if (!storeContext) {
			return new Response('Invalid store', { status: 400 });
		}

		/**
		 * process the request
		 */

		const jsonInput  = await request.json() as any[];
		return processIncoming(request, jsonInput);
		

    },
	
};





async function processIncoming( request: Request, postedData: any[]){
	if (request.method !== 'POST'){
		return new Response("Not a POST request", { status: 400 });
	}
	if (!Array.isArray(postedData)){
		return new Response("Posted data is not an array", { status: 400 });
	}
	const processedData = await jsonProcess(postedData);
	const quantitiesArray = processedData.valid.map(product => {
		// Map the stock of each ProductPrototype to the setQuantities format expected by Quantities
		const setQuantities = product.stock.map(stockItem => {
			return {
				locationId: stockItem.inventoryItemId, // Assuming you want to map inventoryItemId to locationId
				inventoryItemId: stockItem.locationId, // Assuming a direct mapping here
				quantity: stockItem.available         // Map the 'available' field to 'quantity'
			};
		});
	
		return new Quantities('correction', setQuantities);
	});

	// Serialize Quantities instances to JSONL
   
	const jsonl= serializeToJsonL(quantitiesArray);

	//we will workwith the jsonl
	//console.log("Processed Data:", JSON.stringify(processedData));
	return new Response(JSON.stringify(jsonl));

}


//TODO: Continue to make the mutation to shopify 


