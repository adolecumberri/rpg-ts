import { makeCursedRing, makeFireSword, makeHealthPotion, makeWoodenShield } from '../worldTest/core/items';
import { itemStatsSummary, itemStatsText } from '../worldTest/core/view/itemStats';

describe('item stats summary', () => {
    it('lists the fire sword conversion', () => {
        expect(itemStatsSummary(makeFireSword())).toEqual([
            { icon: '🔥', text: 'converts attack to fire (+12)' },
        ]);
    });

    it('lists the shield defence and fire resistance', () => {
        expect(itemStatsSummary(makeWoodenShield())).toEqual([
            { icon: '🛡️', text: '+5 defence' },
            { icon: '🔥', text: 'resist 4 fire' },
        ]);
    });

    it('handles percentage buffs, debuffs and resistances on the cursed ring', () => {
        const text = itemStatsText(makeCursedRing());
        expect(text).toContain('+20% attack');
        expect(text).toContain('-30% hp');
        expect(text).toContain('resist 5 lightning');
    });

    it('returns no lines for a plain consumable', () => {
        expect(itemStatsSummary(makeHealthPotion())).toEqual([]);
    });
});
