export interface StockItem {
    inventoryItemId: string;
    locationId: string;
    available: number;
    updatedAt: string;
}
 
export interface Product {
    shopifyProductId: string;
    shopifyVariantId: string;
    stock: StockItem[];
    clone: (product: Product) => Product;
}
 
export const productPrototype: Product = {
    shopifyProductId: '',
    shopifyVariantId: '',
    stock: [],
    clone: function(product: Product): Product {
        return {
            shopifyProductId: product.shopifyProductId,
            shopifyVariantId: product.shopifyVariantId,
            stock: product.stock.map(item => ({ ...item })), // Assuming StockItem objects are shallow
            clone: this.clone // Keep the clone method reference
        };
    }
};
 
function isValidStockItem(item: any): item is StockItem {
    return typeof item === 'object' &&
           typeof item.inventoryItemId === 'string' && item.inventoryItemId.length &&
           typeof item.locationId === 'string' && item.locationId.length &&
           typeof item.available === 'number' &&
           typeof item.updatedAt === 'string';
}
 
function isValidProduct(product: any): product is Product {
    return typeof product === 'object' &&
           typeof product.ShopifyProductId === 'string' && product.ShopifyProductId.length &&
           typeof product.ShopifyVariantId === 'string' && product.ShopifyVariantId.length &&
           Array.isArray(product.stock) && product.stock.every(isValidStockItem);
}

export async function validateAndTransformData(jsonArray: Array<any>): Promise<{ valid: Product[]; invalid: any[]; }> {
    //console.log('this is the json array',jsonArray);
    const validProducts = jsonArray.filter(isValidProduct).map(product => productPrototype.clone(product));
    const invalidProducts = jsonArray.filter(item => !isValidProduct(item));
  

    return { valid: validProducts, invalid: invalidProducts };
}





// function isValidStockItem(item: unknown): item is StockItem {
//     return typeof item === 'object' &&
//            item !== null &&
//            'inventoryItemId' in item && typeof (item as StockItem).inventoryItemId === 'string' && (item as StockItem).inventoryItemId.length > 0 &&
//            'locationId' in item && typeof (item as StockItem).locationId === 'string' && (item as StockItem).locationId.length > 0 &&
//            'available' in item && typeof (item as StockItem).available === 'number' &&
//            'updatedAt' in item && typeof (item as StockItem).updatedAt === 'string';
// }

// function isValidProduct(product: unknown): product is Product {
//     return typeof product === 'object' &&
//            product !== null &&
//            'shopifyProductId' in product && typeof (product as Product).shopifyProductId === 'string' && (product as Product).shopifyProductId.length > 0 &&
//            'shopifyVariantId' in product && typeof (product as Product).shopifyVariantId === 'string' && (product as Product).shopifyVariantId.length > 0 &&
//            'stock' in product && Array.isArray((product as Product).stock) && (product as Product).stock.every(isValidStockItem);
// }
 


