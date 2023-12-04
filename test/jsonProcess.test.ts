import { json } from "../jest.config";

const jsonData = require('./test.json');
import { jsonProcess, ProductPrototype,Product } from '../src/transformers/jsonProcess';




/**
 * ------------------TESTS------------------
 * Beginning of test suite for jsonProcess function
 * It should validate the json array and return the valid and invalid arrays
 * we will use the Product interface to validate the json array
 * 
 */




describe('jsonProcess', () => {
    //init new product prototype
    
    beforeEach(() => {
       let Prototype = new ProductPrototype(
              '123',
              '456',
              [
                {
                     inventoryItemId: '789',
                     locationId: '101',
                     available: 5,
                     updatedAt: '2023-04-01T00:00:00Z',
                },
                {
                    inventoryItemId: '789',
                    locationId: '101',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',}
              ]
         );
       ;}
    );
    const jsonArray: Array<Product> = jsonData;

   it('returns the json array with the correct interface', async () => {
    expect(() => jsonProcess(jsonArray)).not.toThrow();
   });

   it('returns invalid items with an invalid count for wrong types', async () => {
    const invalidCount: Array<any> = [
        {
            ShopifyProductId: 34,
            ShopifyVariantId: '456',
            stock: [
                {
                    inventoryItemId: '789',
                    locationId: '101',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',
                },
            ],
        },
        {
            ShopifyProductId: '333',
            ShopifyVariantId: '456',
            stock: [
                {
                    inventoryItemId: '789',
                    locationId: '101',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',
                },
            ],
        },
    ];

    const { valid, invalid } = await jsonProcess(invalidCount);

    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(1);
   });
    
   it('return items as invalid if they are missing a required field or a field is an emptry set',async () => {
    const invalidCount: Array<any> = [
        {
           
            ShopifyVariantId: '456',
            stock: [
                {
                    inventoryItemId: '789',
                    locationId: '101',
                    available: 5,
                },
            ],
        },
        {
            ShopifyProductId: '232',
            ShopifyVariantId: '456',
            stock: [
                {
                    inventoryItemId: '789',
                    locationId: '101',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',
                },
            ],
        },
        
    ];
    const { valid, invalid } = await jsonProcess(invalidCount);

    //expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(1);
});

    it.todo(
        'returns the json array with the correct interface and verify the values are in the right format'
    );

   it('returns an empty array if the json array is empty', async() => {
    const emptyArray: Array<any> = [];
    const { valid, invalid } =  await jsonProcess(emptyArray);

    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(0);
   });

   it('returns valid items when the stock has multiple items',async () => {

    const validCount: Array<any> = [
        {
            ShopifyProductId: '123',
            ShopifyVariantId: '456',
            stock: [
                {
                    inventoryItemId: '789',
                    locationId: '101',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',
                },
                {
                    inventoryItemId: '3223',
                    locationId: '10132323',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',
                },
            ],
        },
        {
            ShopifyProductId: '123',
            ShopifyVariantId: '456',
            stock: [
                {
                    inventoryItemId: '789',
                    locationId: '101',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',
                },
                {
                    inventoryItemId: '3223',
                    locationId: '10132323',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',
                },
                {
                    inventoryItemId: '3223',
                    locationId: '10132323',
                    available: 5,
                    updatedAt: '2023-04-01T00:00:00Z',
                },
            ],
        }
    ];

    const { valid, invalid } = await jsonProcess(validCount);

    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(0);
   });

});





/**
 * this defines the interface that the json objects in the array should be converted to 
 * 
 * interface Product {

					ShopifyProductId: string;

					ShopifyVariantId: string;
                    
                    stock:[{

                        inventoryItemId: string;

                        locationId: string;

                        available: number;

                        updatedAt: string;
                    }]

                    


 * 
 * 
 */


                  