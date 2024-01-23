import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { XMLParser } from 'fast-xml-parser';
import { BulkOperationResponse } from '../interfaces';
export type StoreDetails = { storeUrl: string, storeKey: string };
export type DataParam = { name: string, value: string };
interface Parameter {
    name: string;
    value: string;
}

interface StagedTarget {
    url: string;
    resourceUrl: null;
    parameters: Parameter[];
}

export interface StagedUploadResponse {
    data: {
        stagedUploadsCreate: {
            userErrors: any[]; // Define the expected shape if known
            stagedTargets: StagedTarget[];
        };
    };
    extensions?: {
        cost: {
            requestedQueryCost: number;
            actualQueryCost: number;
        };
    };
}

const CONTENT_TYPE = 'application/json';
const METHOD_POST = 'POST';
const RESOURCE = 'BULK_MUTATION_VARIABLES';
const TEXT_JSONL = 'text/jsonl';



//a function to build the staged upload mutation


function buildStagedUploadMutation(key: string) {
    return `mutation StagedUploadsCreate {
        stagedUploadsCreate(
            input: {filename: "${key}", mimeType: "${TEXT_JSONL}", httpMethod: ${METHOD_POST}, resource: ${RESOURCE}}
        ) {
            stagedTargets {
                resourceUrl
                url
                parameters {
                    name
                    value
                }
            }
            userErrors {
                field
                message
            }
        }
    }`;
}






async function extractFromXML(xmlString: string, tagName: string): Promise<string> {
    // finally imported the parser, congrats!
    const parser = new XMLParser();
    let jsonObj = parser.parse(xmlString);

    // navigating through the jsonObj like a pro
    // check if PostResponse exists and then look for tagName
    return jsonObj?.PostResponse?.[tagName] || "oops, can't find it";
}












export class UpdateInventoryQuantities {

    private context: StoreDetails;
    private key: string;
    constructor(context: StoreDetails, key: string) {
        this.context = context;
        this.key = key;
    }
    public async stageUpload(): Promise<{ url: string, dataParams: DataParam[] } | null> {

        const { storeKey } = this.context;
        const mutation = buildStagedUploadMutation(this.key);
        try {
            const request: RequestInit = {
                method: METHOD_POST,
                headers: {
                    'Content-Type': CONTENT_TYPE,
                    'X-Shopify-Access-Token': storeKey,
                },
                body: JSON.stringify({ query: mutation }),
            };

            const contextualizedUrl = `https://${this.context.storeUrl}.myshopify.com/admin/api/2023-10/graphql.json`;
            //console.log('contextualizedUrl', contextualizedUrl);
            const response = await fetch(contextualizedUrl, request);
            const responseJson = await response.json() as StagedUploadResponse;
            if (responseJson.data && responseJson.data.stagedUploadsCreate.stagedTargets.length > 0) {
                const { url, parameters } = responseJson.data.stagedUploadsCreate.stagedTargets[0];
                return { url, dataParams: parameters };
            }
            if (responseJson.data.stagedUploadsCreate.userErrors.length) {
                console.error('Error in stageUpload', responseJson.data.stagedUploadsCreate.userErrors);
                return null;
            }
        } catch (error) {
            console.error('Error in stageUpload', error);
        }

        return null;

    }
    async fileUploadReport(location: string, store: string): Promise<void> {

        const constructMessage = constructUploadMessage(location, store);
        const uploadPromise = await fetch('https://hook.us1.make.com/jk9l84bajlop2fb2bjqy2cmxag3d133f', {
            method: METHOD_POST,
            body: constructMessage,
        })
        if (!uploadPromise.ok) {
            console.log('failed', uploadPromise.statusText);
        } else {
            console.log('Success: Message sent');
        }


        return Promise.resolve();
    }
    async uploadFile(url: string, dataParams: DataParam[], jsonl: string): Promise<string> {
        if (!Array.isArray(dataParams) || dataParams.length === 0) {
            throw new Error('dataParams must be a non-empty array'); // let's not pretend bad data is okay
        }
    
        const formData = new FormData();
        try {
            dataParams.forEach(param => {
                if (!param.name || !param.value) {
                    throw new Error('Each dataParam must have a name and value'); 
                }
                formData.append(param.name, param.value);
            });
            formData.append('file', new Blob([jsonl], { type: 'text/jsonl' }));
    
            const response = await fetch(url, {
                method: METHOD_POST,
                body: formData,
                // no need to set Content-Type for FormData, fetch does it for us, smarty-pants
            });
    
            if (!response.ok) {
                throw new Error(`Error Uploading file: ${response.statusText}`); // if something's wrong, let's actually do something about it
            }
    
            const responseText = await response.text();
            const location = await extractFromXML(responseText, 'Location');
            if (!location) {
                throw new Error('Location not found in response'); // because blindly trusting functions is a no-no
            }
            await this.fileUploadReport(location, this.context.storeUrl);
    
            const key = await extractFromXML(responseText, 'Key');
            if (!key) {
                throw new Error('Key not found in response'); // consistency is key, get it?
            }
    
            return key;
        } catch (error) {
            console.error('Error uploading file to Google Cloud storage', error); // log and handle errors like a boss
            throw error; // rethrowing is fine, but at least we know what went wrong
        }
    }
    
        public async sendBulkMutation(jsonl: string) {
            const { storeUrl, storeKey } = this.context;
        
            const endpoint = `https://${storeUrl}.myshopify.com/admin/api/2023-10/graphql.json`;
            const mutation = `mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
                inventorySetOnHandQuantities(input: $input) {
                userErrors {
                    field
                    message
                }
                inventoryAdjustmentGroup {
                    createdAt
                    reason
                    
                    changes {
                    name
                    delta
                    }
                }
                }
            }
            
            `;

            try {
                

                const graphqlVariables = { input: JSON.parse(jsonl).input }; // Parse and use the 'input' part

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': storeKey,
        },
        body: JSON.stringify({ query: mutation, variables: graphqlVariables })
    });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
        
                const responseData = await response.json();
                console.log('responseData', responseData);
                return responseData;
            } catch (error) {
                console.error('Error in sendBulkMutation', error);
                return null; // Or handle the error as appropriate
            }
        }



}


function constructUploadMessage(location: string, store: string): string {
    const createdAt = format(zonedTimeToUtc(new Date(), 'America/chicago'), 'yyyy-MM-dd HH:mm:ss');
    return `
        <div>
            Inventory update for <b>${store}</b> is in progress! 
            Check the upload files <a style="color:green" href="${location}">here</a> (Updated: ${createdAt}). 
            <h1>🎉</h1>
        </div>`;
}