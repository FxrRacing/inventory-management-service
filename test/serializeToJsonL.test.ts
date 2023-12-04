import { ProductPrototype } from "../src/transformers/jsonProcess";
import { serializeToJsonL, Quantities } from "../src/transformers/serializeToJsonL";

/**
 * ------------------TESTS------------------
 * Beginning of test suite for serializeToJsonL helper function
 */


describe('serializeToJsonL', () => {
    it('returns a jsonl string from an array of objects', async () => {
        const prototype = new Quantities(
            'test',
            [
                {
                    locationId: '11',
                    inventoryItemId: '780',
                    quantity: 5,
                },
                {
                    locationId: '12',
                    inventoryItemId: '781',
                    quantity: 5,
                },
                {
                    locationId: '13',
                    inventoryItemId: '782',
                    quantity: 5,
                },
            ]
        )

        const expectedResult = '{"input":{"reason":"test","setQuantities":[{"locationId":"11","inventoryItemId":"780","quantity":5},{"locationId":"12","inventoryItemId":"781","quantity":5},{"locationId":"13","inventoryItemId":"782","quantity":5}]}}\n';
        const result =  serializeToJsonL([prototype]);
        expect(result).toEqual(expectedResult);
    });

    it('returns an empty string if the array is empty', async () => {
        const result =  serializeToJsonL([]);
        expect(result).toEqual('');
    });

    it('returns an empty string if the array is undefined', async () => {
        const result =  serializeToJsonL(undefined as any);
        expect(result).toEqual('');
    });
    
    it('correctly serialize an array of objects', () => {
        const data = [{ a: 1 }, { b: 2 }];
        const expected = '{"a":1}\n{"b":2}\n';
        expect(serializeToJsonL(data)).toBe(expected);
    });
    it('correctly serialize an array of primitives', () => {
        const data = [1, "string", true];
        const expected = '1\n"string"\ntrue\n';
        expect(serializeToJsonL(data)).toBe(expected);
    });
    it('handles mixed content arrays', () => {
        const data = [1, "string", { a: 1 }, [1, 2, 3]];
        const expected = '1\n"string"\n{"a":1}\n[1,2,3]\n';
        expect(serializeToJsonL(data)).toBe(expected);
    });
    it('handles nested objects', () => {
        const data = [{ a: { b: 2 } }];
        const expected = '{"a":{"b":2}}\n';
        expect(serializeToJsonL(data)).toBe(expected);
    });
    
});