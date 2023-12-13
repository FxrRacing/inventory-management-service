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
            setQuantities: setQuantities.map(q => ({
                ...q,
            })),
        };
    }

    public clone(): Quantities {
        const clonedSetQuantities = this.input.setQuantities.map(item => ({ ...item }));
        return new Quantities(this.input.reason, clonedSetQuantities);
    }
}
export function serializeToJsonL(data: Quantities[]) {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    const serializedData = {
        input: {
            reason: data[0].input.reason,
            setQuantities: data.flatMap(d => d.input.setQuantities)
        }
    };

    return JSON.stringify(serializedData);
}