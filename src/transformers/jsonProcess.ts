export interface Product {
    ShopifyProductId: string;
    ShopifyVariantId: string;
    stock: Array<{
        inventoryItemId: string;
        locationId: string;
        available: number;
        updatedAt: string;
    }>;
    clone: (ShopifyProductId: string, ShopifyVariantId: string, stock: Array<{
        inventoryItemId: string;
        locationId: string;
        available: number;
        updatedAt: string;
    }>) => Product;
}


export const productPrototype: Product = {
    ShopifyProductId: '',
    ShopifyVariantId: '',
    stock: [],
    clone: function(this: Product, ShopifyProductId: string, ShopifyVariantId: string, stock: Product['stock']) {
        const newProduct = Object.create(this);
        newProduct.ShopifyProductId = ShopifyProductId;
        newProduct.ShopifyVariantId = ShopifyVariantId;
        newProduct.stock = stock;
        return newProduct;
    }
};

function isValidProduct(product: any): product is Product {
    return typeof product.ShopifyProductId === 'string' && product.ShopifyProductId.length > 0 &&
           typeof product.ShopifyVariantId === 'string' && product.ShopifyVariantId.length > 0 &&
           Array.isArray(product.stock) &&
           product.stock.every((stockItem: { inventoryItemId: any; locationId: any; available: any; updatedAt: any; }) => 
               typeof stockItem.inventoryItemId === 'string' && stockItem.inventoryItemId.length > 0 &&
               typeof stockItem.locationId === 'string' && stockItem.locationId.length > 0 &&
               typeof stockItem.available === 'number' && 
               typeof stockItem.updatedAt === 'string'
           );
}




export async function jsonProcess(jsonArray: Array<any>): Promise<{ valid: Array<Product>; invalid: Array<any>; }> {
    let valid: Array<Product> = [];
    let invalid: Array<any> = [];

    jsonArray.forEach(item => {
        if (isValidProduct(item)) {
            valid.push(productPrototype.clone(item.ShopifyProductId, item.ShopifyVariantId, item.stock));
        } else {
            invalid.push(item);
        }
    });

    return { valid, invalid };
}
