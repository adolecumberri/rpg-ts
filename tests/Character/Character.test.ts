import { Character } from '../../src/character';
import { DEFAULT_STATS } from '../../src/common/common.constants';


describe('Character status', () => {
    it('Default status check', () => {
        const test_character = new Character({ stats: { hp: 10 } });
        expect(test_character.stats.attack).toBe(DEFAULT_STATS.attack);
        expect(test_character.stats.defence).toBe(DEFAULT_STATS.defence);
        expect(test_character.stats.isAlive).toBe(DEFAULT_STATS.isAlive);
    });

    it('Basic status check', () => {
        const test_character = new Character({ stats: {
            hp: 10,
            attack: 5,
            defence: 2,
            totalHp: 100,
        } });
        expect(test_character.stats.hp).toBe(10);
        expect(test_character.stats.attack).toBe(5);
        expect(test_character.stats.defence).toBe(2);
        expect(test_character.stats.isAlive).toBe(DEFAULT_STATS.isAlive);
        expect(test_character.stats.totalHp).toBe(100);
    });

    it('TotalHP has to change if just HP is added.', () => {
        const test_character = new Character({ stats: {hp: 100 } });
        expect(test_character.stats.hp).toBe(100);
        expect(test_character.stats.totalHp).toBe(100);
    });

    it('unexceted stats are allowed', () => {
        type extraTypes = {
            tormenta: string;
            tierra: string;
            fuego: number;
            agua: string;
        };

        const test_character = new Character<extraTypes>({ stats: {
            tormenta: 'tormenta',
            tierra: 'tierra',
            fuego: 666,
            agua: 'si',
        } });
        expect(test_character.stats.hp).toBe(DEFAULT_STATS.hp);
        expect(test_character.stats.agua).toBe('si');
        expect(test_character.stats.fuego).toBe(666);
        expect(test_character.stats.tierra).toBe('tierra');
        expect(test_character.stats.tormenta).toBe('tormenta');
    });

    it('character dies when HP is 0', () => {
        const test_character = new Character({ stats: { hp: 10 } });
        test_character.stats.hp = 0;
        expect(test_character.stats.isAlive).toBe(0);
        expect(test_character.stats.hp).toBe(0);
        expect(test_character.stats.totalHp).toBe(10);

        test_character.stats.hp = 10;
        expect(test_character.stats.isAlive).toBe(1);
        expect(test_character.stats.hp).toBe(10);
        expect(test_character.stats.totalHp).toBe(10);

        test_character.stats.hp = -10;
        expect(test_character.stats.isAlive).toBe(0);
        expect(test_character.stats.hp).toBe(0);
        expect(test_character.stats.totalHp).toBe(10);
    });
});
