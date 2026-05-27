import { Stats } from '../src/classes/Stats';
import { StatsModifier } from '../src/classes/StatsModifier';
import { MODIFICATION_TYPES } from '../src/constants/stats.constants';

describe('Stats', () => {
    describe('construction', () => {
        it('should initialize with default values', () => {
            const stats = new Stats();
            expect(stats.attack).toBe(0);
            expect(stats.defence).toBe(0);
            expect(stats.isAlive).toBe(1);
        });

        it('should initialize with custom values', () => {
            const stats = new Stats({ attack: 100, defence: 50 });
            expect(stats.attack).toBe(100);
            expect(stats.defence).toBe(50);
        });
    });

    describe('calculateStatValue()', () => {
        it('should return base value when statsModifier is undefined', () => {
            const stats = new Stats({ attack: 100 });
            expect(stats.calculateStatValue('attack')).toBe(100);
        });

        it('should apply BUFF_PERCENTAGE correctly', () => {
            const stats = new Stats({ attack: 100 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE, 20);
            stats.statsModifier = modifier;
            // 100 + (100 * 20/100) = 120
            expect(stats.calculateStatValue('attack')).toBe(120);
        });

        it('should apply DEBUFF_FIXED correctly', () => {
            const stats = new Stats({ attack: 100 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.DEBUFF_FIXED, 10);
            stats.statsModifier = modifier;
            // 100 - 10 = 90
            expect(stats.calculateStatValue('attack')).toBe(90);
        });

        it('should apply BUFF_FIXED correctly', () => {
            const stats = new Stats({ attack: 100 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 25);
            stats.statsModifier = modifier;
            // 100 + 25 = 125
            expect(stats.calculateStatValue('attack')).toBe(125);
        });

        it('should apply DEBUFF_PERCENTAGE correctly', () => {
            const stats = new Stats({ attack: 200 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.DEBUFF_PERCENTAGE, 50);
            stats.statsModifier = modifier;
            // 200 - (200 * 50/100) = 100
            expect(stats.calculateStatValue('attack')).toBe(100);
        });

        it('+20% buff and -10 fixed debuff on 100 base attack should yield 110', () => {
            const stats = new Stats({ attack: 100 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE, 20);
            modifier.setModifier('attack', MODIFICATION_TYPES.DEBUFF_FIXED, 10);
            stats.statsModifier = modifier;
            // 100 + (100 * 20/100) - 10 = 110
            expect(stats.calculateStatValue('attack')).toBe(110);
        });

        it('should round result to 2 decimal places', () => {
            const stats = new Stats({ attack: 100 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE, 33);
            stats.statsModifier = modifier;
            // 100 + 33 = 133
            expect(stats.calculateStatValue('attack')).toBe(133);
        });
    });

    describe('get()', () => {
        it('should delegate to calculateStatValue', () => {
            const stats = new Stats({ attack: 200 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 50);
            stats.statsModifier = modifier;
            expect(stats.get('attack')).toBe(250);
        });
    });
});
