import { StatsModifier } from '../src/classes/StatsModifier';
import { MODIFICATION_TYPES } from '../src/constants/stats.constants';

describe('StatsModifier', () => {
    describe('setModifier / getStatModifier', () => {
        it('should set and retrieve a modifier', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 30);
            expect(modifier.getStatModifier('attack', MODIFICATION_TYPES.BUFF_FIXED)).toBe(30);
        });

        it('should return 0 for unset modifiers', () => {
            const modifier = new StatsModifier();
            expect(modifier.getStatModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE)).toBe(0);
        });

        it('should allow overwriting an existing modifier', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 30);
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 60);
            expect(modifier.getStatModifier('attack', MODIFICATION_TYPES.BUFF_FIXED)).toBe(60);
        });
    });

    describe('getAllStatModifiers()', () => {
        it('should return all four modifier keys for a stat', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE, 20);
            modifier.setModifier('attack', MODIFICATION_TYPES.DEBUFF_FIXED, 10);

            const all = modifier.getAllStatModifiers('attack');
            expect(all[MODIFICATION_TYPES.BUFF_PERCENTAGE]).toBe(20);
            expect(all[MODIFICATION_TYPES.DEBUFF_FIXED]).toBe(10);
            expect(all[MODIFICATION_TYPES.BUFF_FIXED]).toBe(0);
            expect(all[MODIFICATION_TYPES.DEBUFF_PERCENTAGE]).toBe(0);
        });

        it('should initialize defaults for a stat that has no modifiers yet', () => {
            const modifier = new StatsModifier();
            const all = modifier.getAllStatModifiers('defence');
            expect(all[MODIFICATION_TYPES.BUFF_FIXED]).toBe(0);
            expect(all[MODIFICATION_TYPES.BUFF_PERCENTAGE]).toBe(0);
            expect(all[MODIFICATION_TYPES.DEBUFF_FIXED]).toBe(0);
            expect(all[MODIFICATION_TYPES.DEBUFF_PERCENTAGE]).toBe(0);
        });
    });

    describe('removeStatModifier()', () => {
        it('should reset a specific modifier to 0', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 100);
            modifier.removeStatModifier('attack', MODIFICATION_TYPES.BUFF_FIXED);
            expect(modifier.getStatModifier('attack', MODIFICATION_TYPES.BUFF_FIXED)).toBe(0);
        });

        it('should not affect other modifier types on the same stat', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 100);
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE, 50);
            modifier.removeStatModifier('attack', MODIFICATION_TYPES.BUFF_FIXED);
            expect(modifier.getStatModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE)).toBe(50);
        });
    });

    describe('removeAllStatModifiers()', () => {
        it('should reset all modifiers for the specified stat to 0', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 100);
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE, 50);
            modifier.removeAllStatModifiers('attack');

            const all = modifier.getAllStatModifiers('attack');
            expect(all[MODIFICATION_TYPES.BUFF_FIXED]).toBe(0);
            expect(all[MODIFICATION_TYPES.BUFF_PERCENTAGE]).toBe(0);
        });

        it('should not affect modifiers on other stats', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 100);
            modifier.setModifier('defence', MODIFICATION_TYPES.BUFF_FIXED, 30);
            modifier.removeAllStatModifiers('attack');
            expect(modifier.getStatModifier('defence', MODIFICATION_TYPES.BUFF_FIXED)).toBe(30);
        });
    });

    describe('resetAllModifiers()', () => {
        it('should clear every modifier across all stats', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 100);
            modifier.setModifier('defence', MODIFICATION_TYPES.DEBUFF_PERCENTAGE, 20);
            modifier.resetAllModifiers();
            expect(modifier.modifiers).toEqual({});
        });
    });

    describe('setModifiers()', () => {
        it('should replace the entire modifiers record', () => {
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 50);
            modifier.setModifiers({ defence: { BUFF_FIXED: 10, BUFF_PERCENTAGE: 0, DEBUFF_FIXED: 0, DEBUFF_PERCENTAGE: 0 } });
            expect(modifier.modifiers['attack']).toBeUndefined();
            expect(modifier.getStatModifier('defence', MODIFICATION_TYPES.BUFF_FIXED)).toBe(10);
        });
    });

    describe('isPercentageModification()', () => {
        it('should return true for BUFF_PERCENTAGE', () => {
            const modifier = new StatsModifier();
            expect(modifier.isPercentageModification(MODIFICATION_TYPES.BUFF_PERCENTAGE)).toBe(true);
        });

        it('should return true for DEBUFF_PERCENTAGE', () => {
            const modifier = new StatsModifier();
            expect(modifier.isPercentageModification(MODIFICATION_TYPES.DEBUFF_PERCENTAGE)).toBe(true);
        });

        it('should return false for BUFF_FIXED', () => {
            const modifier = new StatsModifier();
            expect(modifier.isPercentageModification(MODIFICATION_TYPES.BUFF_FIXED)).toBe(false);
        });

        it('should return false for DEBUFF_FIXED', () => {
            const modifier = new StatsModifier();
            expect(modifier.isPercentageModification(MODIFICATION_TYPES.DEBUFF_FIXED)).toBe(false);
        });
    });
});
