import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { XMLParser } from 'fast-xml-parser';
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
const  TEXT_JSONL = 'text/jsonl';



//a function to build the staged upload mutation


function buildStagedUploadMutation(key:string ){
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
    const parser = new XMLParser();
    let jsonObj = parser.parse(xmlString);

    // This part depends on the structure of your XML
    // You might need to navigate through the parsed JSON object to find your tag
    return jsonObj?.[tagName] || '';
}












export class UpdateInventoryQuantities {
    
    private context: StoreDetails;
    private key: string;
    constructor(context: StoreDetails, key: string) {
        //  this.request = request;
        // this.env = env;
        this.context = context;
        this.key = key;
    }
    public async stageUpload(): Promise<{ url: string, dataParams: DataParam[] } | null> {

        const {storeKey } = this.context;
        const mutation = buildStagedUploadMutation(this.key);
        //console.log('mutation', mutation);
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
            console.log('contextualizedUrl', contextualizedUrl);
            const response = await fetch( contextualizedUrl,request);
            const responseJson = await response.json() as StagedUploadResponse;
            if (responseJson.data && responseJson.data.stagedUploadsCreate.stagedTargets.length > 0) {
                const { url, parameters } = responseJson.data.stagedUploadsCreate.stagedTargets[0];
                return { url, dataParams: parameters };
            }
            if (responseJson.data.stagedUploadsCreate.userErrors.length) {
                console.error('Error in stageUpload',responseJson.data.stagedUploadsCreate.userErrors);
                return null;
            }
        } catch (error) {
            console.error('Error in stageUpload',error);
        }

        return null;

    }
    async fileUploadReport(location: string, store: string): Promise<void> {
       
        const constructMessage =  constructUploadMessage(location, store);
        const uploadPromise = await fetch('', {
            method: METHOD_POST,
            body: constructMessage,
        })
        if (!uploadPromise.ok) {
            console.log('failed', uploadPromise.statusText);
        }else {
            console.log('Success: Message sent');
        }
    

        return Promise.resolve();
    }
    async uploadFile(url: string, dataParams: DataParam[], jsonl: string): Promise<string> {
        const formData = new FormData();
       try {
        dataParams.forEach(param => formData.append(param.name, param.value));
        formData.append('file', new Blob([jsonl], { type: 'text/jsonl' }));
        const response = await fetch(url, {
            method: METHOD_POST,
            body: formData,
        });
       

       // await this.fileUploadReport(location);

        // parse the xml response 
        const responseText = await response.text();
        const location = await extractFromXML(responseText, 'Location');
        const key = await extractFromXML(responseText, 'Key');
        return key;
       } catch (error) {
        console.log('Error in uploadFile',error); 
        throw error
       }
    }
    async sendBulkMutation(urlUploadPath: string, ) {
        const { storeUrl, storeKey } = this.context;
        const endpoint = `${storeUrl}/admin/api/2021-07/graphql.json`;
        const mutation = `mutation {
			bulkOperationRunMutation(
				mutation: """
                mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
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
                  
			""",
				stagedUploadPath: "${urlUploadPath}"
			) {
				bulkOperation {
					id  
					url
					status
				}
				userErrors {
					message
					field
				}
			}
		}
          `;
        
          try {
            const graphqlQuery = {
                query: mutation,
            };
    
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': storeKey,
                },
                body: JSON.stringify(graphqlQuery)
            });
            const responseJson = await response.json();
            //add an implementation 
          } catch (error) {
            console.error('Error in sendBulkMutation',error);
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