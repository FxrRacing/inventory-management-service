/**
 * Test Suite for UpdateInventoryQuantities Class
 *
 * This test suite is designed to validate the functionality of the `UpdateInventoryQuantities` class, 
 * focusing on the 
 *  1. `stageUpload` method
 * 2.`uploadFile` method
 * 3.`updateInventoryQuantities` method - a mutation method that will update the inventory quantities in shopify
 *
 * Test Setup:
 * - The suite uses a `beforeEach` block to create a fresh instance of `UpdateInventoryQuantities` before each test, 
 *   ensuring isolated test environments. This setup includes providing mock `context` and `key` parameters 
 *   needed for the class constructor.
 * - Additionally, the global `fetch` function is mocked. This is essential as the `stageUpload` method 
 *   depends on making network requests. The mock intercepts these requests, allowing us to simulate 
 *   various response scenarios without actual network calls.
 *
 * Individual Test:
 * - The test case defined checks if the `stageUpload` method correctly returns a URL and data parameters 
 *   for a valid object. This is crucial for verifying the method's ability to handle and format the response 
 *   from a staged upload process.
 * - The response from the mocked `fetch` call is set up to return a predefined JSON structure. This structure 
 *   mimics a successful response from the actual endpoint, including essential data like URLs and parameters.
 * - The test asserts whether the actual response from `stageUpload` matches the expected structure defined 
 *   in the test, ensuring the method's correctness in handling and parsing the network response.
 */




import { Env } from "../src/interfaces";
import{ UpdateInventoryQuantities , StoreDetails} from "../src/transformers/updateInventory";


describe('Successfully creates and upload path', () => {
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









/**
 * test suite for the uploadfile method
 * 
 * 
 */

