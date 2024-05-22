import { lastCommit } from "../../jest.config";
import { StoreDetails } from "./updateInventory";

export interface StockItem {
    inventoryItemId: string;
    locationId: string;
    historyUrl: string;
    available: number;
    updatedAt: string;
}
 
export interface Product {
    displayName: string;
    ShopifyProductId: string;
    ShopifyVariantId: string;
    stock: StockItem[];
    clone: (product: Product) => Product;
}
 
const INVENTORY_ITEM_PREFIX = 'gid://shopify/InventoryItem/';
const LOCATION_PREFIX = 'gid://shopify/Location/';
const URL_PREFIX = '.myshopify.com/admin/products/inventory/';
export const productPrototype: Product = {
    displayName: '',
    ShopifyProductId: '',
    ShopifyVariantId: '',
    stock: [],
    clone: function(product: Product): Product {
        return {
            displayName: product.displayName,
            ShopifyProductId: product.ShopifyProductId,
            ShopifyVariantId: product.ShopifyVariantId,
            stock: product.stock.map(item => ({
             ...item,
             inventoryItemId: `${INVENTORY_ITEM_PREFIX}${item.inventoryItemId}`,
             locationId: `${LOCATION_PREFIX}${item.locationId}`,
             historyUrl: `${URL_PREFIX}${item.inventoryItemId}`
        })), // Assuming StockItem objects are shallow
            clone: this.clone // Keep the clone method reference
        };
    }
};
 
function isValidStockItem(item: any): item is StockItem {
    return typeof item === 'object' &&
           typeof item.inventoryItemId === 'string' && item.inventoryItemId.length >1 &&
           typeof item.locationId === 'string' && item.locationId.length > 1 &&
           typeof item.available === 'number' &&
           typeof item.updatedAt === 'string';
}
 
function isValidProduct(product: any): product is Product {
    return typeof product === 'object' &&
              typeof product.displayName === 'string' && product.displayName.length && 
           typeof product.ShopifyProductId === 'string' && product.ShopifyProductId.length &&
           typeof product.ShopifyVariantId === 'string' && product.ShopifyVariantId.length &&
           Array.isArray(product.stock) && product.stock.every(isValidStockItem);
}

export async function validateAndTransformData(
    jsonArray: Array<any>,
    storeContext: StoreDetails
): Promise<{ valid: Product[]; invalid: any[] }> {
    //console.log('this is the json array',jsonArray);
    const validProducts = jsonArray.filter(isValidProduct).map((product) => productPrototype.clone(product));
    const invalidProducts = jsonArray.filter((item) => !isValidProduct(item));

    const validateWithShopify = validProducts
        .map((product) => {
            const productQuantities = product.stock.map((stockItem) => ({
                inventoryItemId: stockItem.inventoryItemId,
            }));
            return productQuantities;
        })
        .flat();
    
        const inventoryQueries = validateWithShopify
        .map(
            (product, index) =>
                `item${index}: inventoryItem(id: "${product.inventoryItemId}") {
                    id
                }`
        )
        .join('\n');

    const inventoryQuery = `query  validateInventoryItems {
         ${inventoryQueries}
        }`;

    const shopifyData = await fetchGraphQl(inventoryQuery, storeContext);
    //console.log('this is the shopify data', shopifyData);
    const shopifyProductIds = new Set(
        Object.values(shopifyData.data)
            .filter(item => item !== null)
            .map(item => item.id)
    );

// Separate valid and invalid products based on Shopify data
const verifiedProducts = validProducts.filter(product =>
    product.stock.some(stockItem => shopifyProductIds.has(stockItem.inventoryItemId))
);

const invalidProductIds = validProducts.filter(product =>
    !product.stock.some(stockItem => shopifyProductIds.has(stockItem.inventoryItemId))
);

//console.log('this is the verified products', verifiedProducts);

    return { valid: verifiedProducts, invalid: [...invalidProducts, ...invalidProductIds] };
}
//check if the inventory Item id is in the shopify data and add it to 'verifiedProducts' arr

export async function fetchGraphQl(query: string, storeContext: StoreDetails, variables = {}) {
    const contextualUrl = `https://${storeContext.storeUrl}.myshopify.com/admin/api/2024-01/graphql.json`;
    const response = await fetch(contextualUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': storeContext.storeKey,
  
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
    });
    const data = await response.json() as any;
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    if (data.userErrors || data.errors) {
      console.warn('Error occurred with the request to Shopify Graphql API', JSON.stringify(data, null, 2));
      console.log('Query:', query);
      console.log('Variables:', variables);
      console.log('Response:', JSON.stringify(data, null, 2));
      throw new Error('Error occurred with the request to Shopify Graphql API');
    }
    return data;
  }
