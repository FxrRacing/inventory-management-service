import { Env } from "../src/interfaces";
type StoreDetails= {storeUrl: string, storeKey: string};
export type DataParam = {name: string, value: string};
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



describe('updateInventoryQuantities', () => {
    let updateInventoryQuantities: UpdateInventoryQuantities
    const context: StoreDetails = {
        storeUrl: 'https://test.com',
        storeKey: 'testKey',
    }
    const key = 'testKey';
    const mockResponse = {
        json: () => Promise.resolve({
            data: {
                stagedUploadsCreate: {
                    userErrors: [],
                    stagedTargets: [
                        {
                            url: "https://shopify-staged-uploads.storage.googleapis.com",
                            resourceUrl: null,
                            parameters: [
                                { name: "key", value: "tmp/21759409/bulk/2d278b12-d153-4667-a05c-a5d8181623de/bulk_op_vars" },
                                { name: "Content-Type", value: "text/jsonl" },
                                { name: "success_action_status", value: "201" },
                                // ... other parameters
                            ],
                        },
                    ],
                },
            },
            extensions: {
                cost: {
                    requestedQueryCost: 11,
                    actualQueryCost: 11,
                },
            },
        }),
    };
    beforeEach(() => {
       
        updateInventoryQuantities =new UpdateInventoryQuantities(context, key);
       

    });
    afterEach(() => {
        jest.resetAllMocks();
        
    });


    it('returns a url and data params for a valid object', async () => {
        // Call the method you want to test
        globalThis.fetch = jest.fn().mockResolvedValue(mockResponse) as jest.Mock;
        const result = await updateInventoryQuantities.stageUpload();

        const expectedResponse = {
            url: "https://shopify-staged-uploads.storage.googleapis.com",
            dataParams: [
                { name: "key", value: "tmp/21759409/bulk/2d278b12-d153-4667-a05c-a5d8181623de/bulk_op_vars" },
                { name: "Content-Type", value: "text/jsonl" },
                { name: "success_action_status", value: "201" },
                // ... other parameters
            ],
        };

        expect(result).toEqual(expectedResponse);
       
    });
    it('returns null for an invalid object', async () => {
        // Call the method you want to test
        const result = await updateInventoryQuantities.stageUpload();

        const expectedResponse = null;

        expect(result).toEqual(expectedResponse);
       
    });

});





class UpdateInventoryQuantities{
    //private request: Request;
   // private env: Env;
    private context: StoreDetails ;
    private key: string;
    constructor( context: StoreDetails, key: string) {
      //  this.request = request;
       // this.env = env;
        this.context = context;
        this.key = key;
    }
    public async stageUpload(): Promise<{ url: string, dataParams: DataParam[] }| null> {
       
        const{ storeUrl, storeKey} = this.context;
        const mutation = `mutation StagedUploadsCreate {
            stagedUploadsCreate(
                input: {filename: "${this.key}", mimeType: "text/jsonl", httpMethod: POST, resource: BULK_MUTATION_VARIABLES}
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
        try {
            const request: RequestInit = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': storeKey,
                },
                body: JSON.stringify({ query: mutation }),
            };
            const response = await fetch(storeUrl, request);
            const responseJson = await response.json()as  StagedUploadResponse;
            const url = responseJson.data.stagedUploadsCreate.stagedTargets[0].url;
            const dataParams = responseJson.data?.stagedUploadsCreate.stagedTargets[0].parameters;
            return { url, dataParams };
        } catch (error) {
            
        }

        return null;
        
    }

}