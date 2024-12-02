import { AttackResult, AttackType, Character, CharacterConstructor, DefenceResult } from '../../src/character';
import { ATTACK_TYPE, DEFAULT_STATS } from '../../src/common/common.constants';


describe('Character status', () => {
    it('Default status check', () => {
        const test_character = new Character({ stats: { hp: 10 } });
        expect(test_character.stats.attack).toBe(DEFAULT_STATS.attack);
        expect(test_character.stats.defence).toBe(DEFAULT_STATS.defence);
        expect(test_character.stats.isAlive).toBe(DEFAULT_STATS.isAlive);
    });

    it('Basic status check', () => {
        const test_character = new Character({
            stats: {
                hp: 10,
                attack: 5,
                defence: 2,
                totalHp: 100,
            },
        });
        expect(test_character.stats.hp).toBe(10);
        expect(test_character.stats.attack).toBe(5);
        expect(test_character.stats.defence).toBe(2);
        expect(test_character.stats.isAlive).toBe(DEFAULT_STATS.isAlive);
        expect(test_character.stats.totalHp).toBe(100);
    });

    it('TotalHP has to change if just HP is added.', () => {
        const test_character = new Character({ stats: { hp: 100 } });
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

        const test_character = new Character({
            stats: {
                tormenta: 'tormenta',
                tierra: 'tierra',
                fuego: 666,
                agua: 'si',
            },
        });
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
            const test_character = new Character({
                stats: {
                    crit: 100,
                    attack: 1,
                    critMultiplier: 2,
                },
            });
            test_character.addDamageCalculation(ATTACK_TYPE.CRITICAL, (stats) => stats.attack * (stats.critMultiplier ?? 2));
            expect(test_character.stats.critMultiplier).toBe(2);
            expect(test_character.calculateDamage('critical')).toBeTruthy();
            expect(test_character.stats.crit).toBe(100);

            test_character.attack();

            const attack_object = test_character.attack();
            expect(attack_object.type).toBe(ATTACK_TYPE.CRITICAL);
            expect(attack_object.value).toBe(2);
        });

        it('custom crit multiplier', () => {
            const test_character = new Character({ stats: { hp: 10, crit: 100, attack: 1, critMultiplier: 3 } });
            expect(test_character.stats.crit).toBe(100);

            test_character.addDamageCalculation(ATTACK_TYPE.CRITICAL,
                (stats) => stats.attack * (stats.critMultiplier ?? 2),
            );

            const attack_object = test_character.attack();

            expect(attack_object.type).toBe(ATTACK_TYPE.CRITICAL);
            expect(attack_object.value).toBe(3);
        });
    });

    it('Default miss attack object', () => {
        const test_character = new Character({ stats: { accuracy: 0 } });
        expect(test_character.stats.accuracy).toBe(0);

        const attack_object = test_character.attack();
        const attack_object2 = test_character.calculateDamage(ATTACK_TYPE.MISS);
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

            expect(attack_object.type).toBe('magic');
            expect(attack_object.value).toBe(666);
        });

        it('Custom attack function with this', () => {
            const test_character = new Character({ stats: { attack: 40 } });
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
            const test_character = new Character({ stats: { attack: 40 } });
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

    it('Attack function can be removed', () => {
        const test_character = new Character();
        test_character.removeDamageCalculation(ATTACK_TYPE.NORMAL);
        expect(
            () => test_character.calculateDamage(ATTACK_TYPE.NORMAL),
        ).toThrowError('No damage calculation function for: normal');
        test_character.removeDamageCalculation(ATTACK_TYPE.MISS);
        expect(
            () => test_character.calculateDamage(ATTACK_TYPE.MISS),
        ).toThrowError('No damage calculation function for: miss');
    });

    describe('Attack calculation', () => {
        it('Attack calculation', () => {
            const test_character = new Character({ stats: { attack: 10 } });

            expect(test_character.damageCalculation).toBeTruthy();
            test_character.damageCalculation = {
                [ATTACK_TYPE.NORMAL]: (stats) => 1,
                [ATTACK_TYPE.MISS]: () => 0,
            };
            expect(test_character.damageCalculation).toBeTruthy();

            test_character.addDamageCalculation('true', () => 333);

            const damage = test_character.calculateDamage(ATTACK_TYPE.TRUE);
            expect(damage).toBe(333);
        });


        it('Attack calculation with invalid type', () => {
            const test_character = new Character({ stats: { attack: 10 } });
            expect(
                () => test_character.calculateDamage('other'),
            ).toThrowError('No damage calculation function for: other');
        });
    });
});

describe('Defence calculation', () => {
    it('Default defence calculation', () => {
        const test_character = new Character();
        let attack_object: AttackResult = {
            atacker: test_character,
            type: ATTACK_TYPE.NORMAL,
            value: 10,
        };

        let defence_objecct = test_character.defence(attack_object);
        expect(defence_objecct.type).toBe('normal');
        expect(defence_objecct.value).toBe(10);

        attack_object = {
            type: ATTACK_TYPE.MISS,
            value: 10,
        };
        defence_objecct = test_character.defence(attack_object);
        expect(defence_objecct.type).toBe('miss');
        expect(defence_objecct.value).toBe(0);

        attack_object = {
            type: ATTACK_TYPE.TRUE,
            value: 10,
        };
        defence_objecct = test_character.defence(attack_object);
        expect(defence_objecct.type).toBe('true');
        expect(defence_objecct.value).toBe(10);
    });

    it('Custom defence calculation', () => {
        const test_character = new Character({ stats: { defence: 10, attack: 10, accuracy: 100 } });
        test_character.defenceCalculation = function(this: Character, attack: AttackResult) {
            return attack.value - this.stats.defence;
        };

        let attack_object = test_character.attack();
        expect(attack_object.type).toBe('normal');
        expect(attack_object.value).toBe(10);

        let defence = test_character.defence(attack_object);
        expect(defence.type).toBe('normal');
        expect(defence.value).toBe(0);

        test_character.stats.accuracy = 0;
        attack_object = test_character.attack();
        defence = test_character.defence(attack_object);
        expect(defence.type).toBe('miss');
        expect(defence.value).toBe(0);

        test_character.stats.defence = 15;
        test_character.stats.accuracy = 100;
        attack_object = test_character.attack();
        defence = test_character.defence(attack_object);
        expect(defence.type).toBe('normal');
        expect(defence.value).toBe(-5);
    });

    it('Custom defence calculation with this', () => {
        const test_character = new Character({ stats: { defence: 10, attack: 10, accuracy: 100 } });
        test_character.defenceCalculation = function(this: Character<typeof test_character.stats>, attack: AttackResult) {
            return attack.value - this.stats.defence;
        };

        let attack_object = test_character.attack();
        expect(attack_object.type).toBe('normal');
        expect(attack_object.value).toBe(10);

        let defence = test_character.defence(attack_object);
        expect(defence.type).toBe('normal');
        expect(defence.value).toBe(0);

        test_character.stats.accuracy = 0;
        attack_object = test_character.attack();
        defence = test_character.defence(attack_object);
        expect(defence.type).toBe('miss');
        expect(defence.value).toBe(0);

        test_character.stats.defence = 15;
        test_character.stats.accuracy = 100;
        attack_object = test_character.attack();
        defence = test_character.defence(attack_object);
        expect(defence.type).toBe('normal');
        expect(defence.value).toBe(-5);
    });

    it('override defence', () => {
        const test_character = new Character();
        test_character.defence = function() {
            return {
                type: 'skill',
                value: 666,
            } satisfies DefenceResult;
        };
        expect(test_character.defence().value).toBe(666);
        expect(test_character.defence().type).toBe('skill');
    });
});

describe('Character alive status', () => {
    it('Character can check alive Status', () => {
        const test_character = new Character({ stats: { hp: 10 } });
        expect(test_character.isAlive()).toBe(true);

        test_character.stats.hp = 0;
        expect(test_character.isAlive()).toBe(false);

        test_character.stats.hp = 10;
        expect(test_character.isAlive()).toBe(true);

        test_character.stats.hp = -10;
        expect(test_character.isAlive()).toBe(false);
        expect(test_character.stats.hp).toBe(0);
    });

    it('Character can receive damage', () => {
        const test_character = new Character({ stats: { hp: 10 } });
        test_character.receiveDamage({ type: 'normal', value: 10 });
        expect(test_character.stats.hp).toBe(0);
        expect(test_character.stats.isAlive).toBe(0);
    });
});


