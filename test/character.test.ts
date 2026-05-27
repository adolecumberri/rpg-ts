import { Character } from '../src/classes/Character';
import { Stats } from '../src/classes/Stats';
import { StatsModifier } from '../src/classes/StatsModifier';
import { MODIFICATION_TYPES } from '../src/constants/stats.constants';

describe('Character', () => {
    describe('construction', () => {
        it('should create a character with a generated id and default stats', () => {
            const character = new Character({});
            expect(character.id).toBeDefined();
            expect(character.stats).toBeInstanceOf(Stats);
        });

        it('should create a character with custom stats', () => {
            const stats = new Stats({ attack: 100, defence: 50 });
            const character = new Character({ stats });
            expect(character.stats.attack).toBe(100);
            expect(character.stats.defence).toBe(50);
        });
    });

    describe('stat modifiers via character.stats.get()', () => {
        it('should return base value when no modifier is attached', () => {
            const stats = new Stats({ attack: 100 });
            const character = new Character({ stats });
            expect(character.stats.get('attack')).toBe(100);
        });

        it('+20% buff and -10 fixed debuff on 100 base attack should yield 110', () => {
            const stats = new Stats({ attack: 100 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_PERCENTAGE, 20);
            modifier.setModifier('attack', MODIFICATION_TYPES.DEBUFF_FIXED, 10);
            stats.statsModifier = modifier;

            const character = new Character({ stats });

            // 100 + (100 * 20/100) - 10 = 100 + 20 - 10 = 110
            expect(character.stats.get('attack')).toBe(110);
        });

        it('should apply only a fixed buff', () => {
            const stats = new Stats({ attack: 100 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 50);
            stats.statsModifier = modifier;

            const character = new Character({ stats });
            expect(character.stats.get('attack')).toBe(150);
        });

        it('should apply only a percentage debuff', () => {
            const stats = new Stats({ attack: 100 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.DEBUFF_PERCENTAGE, 10);
            stats.statsModifier = modifier;

            const character = new Character({ stats });
            // 100 - (100 * 10/100) = 90
            expect(character.stats.get('attack')).toBe(90);
        });

        it('should leave unmodified stats unaffected', () => {
            const stats = new Stats({ attack: 100, defence: 40 });
            const modifier = new StatsModifier();
            modifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 20);
            stats.statsModifier = modifier;

            const character = new Character({ stats });
            expect(character.stats.get('attack')).toBe(120);
            expect(character.stats.get('defence')).toBe(40);
        });
    });
});
