import { getRandomInt, uniqueID } from '../../src/common/common.helpers';


describe('unique id creates unique ids', () => {
    it('creates a unique id', () => {
        const id1 = uniqueID();
        const id2 = uniqueID();
        expect(id1).not.toBe(id2);
    });

    it('random int is between min and max', () => {
        let min = 50;
        let max = 55;
        const randomInt = getRandomInt(min, max);
        expect(randomInt).toBeGreaterThanOrEqual(min);
        expect(randomInt).toBeLessThanOrEqual(max);

        const randomInt2 = getRandomInt();
        expect(randomInt2).toBeGreaterThanOrEqual(0);
        expect(randomInt2).toBeLessThanOrEqual(100);

        min = 10;
        max = 10;
        const randomInt3 = getRandomInt(min, max);
        expect(randomInt3).toBeGreaterThanOrEqual(min);
        expect(randomInt3).toBeLessThanOrEqual(max);
    });
});
