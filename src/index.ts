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

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
	SHARED_SECRET: string;
}
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {



		//this needs to be rewritten  to use router instead 
		if (request.method === 'POST') {
            const postedData: any[] = await request.json() as any[];

            if (Array.isArray(postedData)) {
                // Await the asynchronous jsonProcess function
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
                //console.log("Processed Data:", JSON.stringify(processedData));
                return new Response(JSON.stringify(jsonl));
            }

            return new Response("Posted data is not an array", { status: 400 });
        }
		return new Response('Received a request that was not a  POST', { status: 400 });

    },
};






