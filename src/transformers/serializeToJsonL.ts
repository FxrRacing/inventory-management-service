export class Quantities {
    input: {
        reason: string;
        setQuantities: Array<{
            locationId: string;
            inventoryItemId: string;
            quantity: number; // Corrected spelling of 'quantity'
        }>;
    };
    constructor(
        reason: string,
        setQuantities: Array<{
            locationId: string;
            inventoryItemId: string;
            quantity: number;
        }>
    ) {
        this.input = {
            reason,
            setQuantities,
        };
    }
    

}



export function serializeToJsonL(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    return data.map((item: any) => JSON.stringify(item)).join('\n') + '\n';
}
