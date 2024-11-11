import { AttackResult, AttackType, Character } from '../../src/character';
import { ATTACK_TYPE, DEFAULT_STATS } from '../../src/common/common.constants';


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

describe('Character attacks', () => {
    it('Default normal attack object', () => {
        const test_character = new Character();
        const attack_object = test_character.attack();

        expect(attack_object.type).toBe(ATTACK_TYPE.NORMAL);
        expect(attack_object.value).toBe(0);

        test_character.stats.attack = 10;
        const attack_object2 = test_character.attack();
        expect(attack_object2.type).toBe(ATTACK_TYPE.NORMAL);
        expect(attack_object2.value).toBe(10);
    });

    describe('Default critical attack object', () => {
        it('default crit multiplier', () => {
            const test_character = new Character({ stats: { crit: 100, attack: 1 } });
            expect(test_character.stats.crit).toBe(100);

            const attack_object = test_character.attack();
            expect(attack_object.type).toBe(ATTACK_TYPE.CRITICAL);
            expect(attack_object.value).toBe(2);
        });

        it('custom crit multiplier', () => {
            const test_character = new Character({ stats: { hp: 10, crit: 100, attack: 1, critMultiplier: 3 } });
            expect(test_character.stats.crit).toBe(100);

            const attack_object = test_character.attack();

            expect(attack_object.type).toBe(ATTACK_TYPE.CRITICAL);
            expect(attack_object.value).toBe(3);
        });
    });

    it('Default miss attack object', () => {
        const test_character = new Character({ stats: { accuracy: 0 } });
        expect(test_character.stats.accuracy).toBe(0);

        const attack_object = test_character.attack();
        expect(attack_object.type).toBe(ATTACK_TYPE.MISS);
        expect(attack_object.value).toBe(0);
    });

    describe('Custom attack function', () => {
        it('Custom attack function', () => {
            const test_character = new Character();
            const attack_function = function() {
                return {
                    type: 'magic',
                    value: 666,
                } satisfies AttackResult;
            };
            test_character.attack = attack_function;
            const attack_object = test_character.attack();
            console.log(attack_object);
            expect(attack_object.type).toBe('magic');
            expect(attack_object.value).toBe(666);
        });

        it('Custom attack function with this', () => {
            const test_character = new Character({ stats: {attack: 40} });
            const attack_function = function(this: Character) {
                return {
                    type: 'magic',
                    // eslint-disable-next-line no-invalid-this
                    value: this.stats.attack,
                } satisfies AttackResult;
            };
            test_character.attack = attack_function;

            const attack_object = test_character.attack();
            expect(attack_object.type).toBe('magic');
            expect(attack_object.value).toBe(40);

            test_character.stats.attack = 666;
            const attack_object2 = test_character.attack();
            expect(attack_object2.type).toBe('magic');
            expect(attack_object2.value).toBe(666);
        });

        it('Custom attack function with this and parameters', () => {
            const test_character = new Character({ stats: {attack: 40} });
            const attack_function = function(this: Character, attack: number) {
                return {
                    type: 'true',
                    value: attack,
                } satisfies AttackResult;
            };
            test_character.attack = attack_function;

            const attack_object = test_character.attack(666);
            expect(attack_object.type).toBe('true');
            expect(attack_object.value).toBe(666);

            test_character.stats.attack = 666;
            const attack_object2 = test_character.attack(40);
            expect(attack_object2.type).toBe('true');
            expect(attack_object2.value).toBe(40);
        });
    });

    describe('Attack calculation', () => {
        it('Attack calculation', () => {
            const test_character = new Character({ stats: { attack: 10 } });
            test_character.damageCalculation.true = () => 333;

            const damage = test_character.calculateDamage(ATTACK_TYPE.TRUE, test_character.stats);
            expect(damage).toBe(333);
        });


        it('Attack calculation with invalid type', () => {
            const test_character = new Character({ stats: { attack: 10 } });
            expect(
                () => test_character.calculateDamage('other', test_character.stats),
            ).toThrowError('No damage calculation function for: other');
        });
    });
});
