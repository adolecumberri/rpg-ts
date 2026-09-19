import { columnsFor } from '../worldTest/core/config/battleLayout';

describe('columnsFor', () => {
    it('keeps small teams in 2 columns', () => {
        expect(columnsFor(1)).toBe(2);
        expect(columnsFor(2)).toBe(2);
        expect(columnsFor(3)).toBe(2);
    });

    it('uses 3 columns for teams from 4 to 6 fighters', () => {
        expect(columnsFor(4)).toBe(3);
        expect(columnsFor(5)).toBe(3);
        expect(columnsFor(6)).toBe(3);
    });

    it('uses 4 columns for teams from 7 to 10 fighters', () => {
        expect(columnsFor(7)).toBe(4);
        expect(columnsFor(9)).toBe(4);
        expect(columnsFor(10)).toBe(4);
    });

    it('uses 5 columns for teams from 11 to 30 fighters', () => {
        expect(columnsFor(11)).toBe(5);
        expect(columnsFor(20)).toBe(5);
        expect(columnsFor(30)).toBe(5);
    });

    it('caps at 6 columns no matter how big the crowd gets', () => {
        expect(columnsFor(31)).toBe(6);
        expect(columnsFor(80)).toBe(6);
        expect(columnsFor(120)).toBe(6);
    });
});
