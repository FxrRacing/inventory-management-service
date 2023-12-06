export class Quantities {
    public input: {
        reason: string;
        setQuantities: Array<{
            locationId: string;
            inventoryItemId: string;
            quantity: number;
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

    public clone(): Quantities {
        const clonedSetQuantities = this.input.setQuantities.map(item => ({ ...item }));
        return new Quantities(this.input.reason, clonedSetQuantities);
    }
}





export function serializeToJsonL(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    return data.map((item: any) => JSON.stringify(item)).join('\n') + '\n';
}
