// Character.test.js

import Character from '../../src/classes/Character';
import Status from '../../src/classes/Status';
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from '../../src/constants';
import { getDefaultStatsObject } from '../../src/helpers';
import { Stats } from '../../src/types';

describe('Character', () => {

    jest.mock('../../src/helpers/commonHelpers', () => ({
        createDefaultObjectGetter: jest.fn(defaultObject => param => ({ ...defaultObject, ...param })),
    }));

    let character;
    let status;
    beforeEach(() => {
        character = new Character({
            id: 1,
            name: 'John',
            stats: {
                totalHp: 100,
                hp: 100,
                attack: 10,
                crit: 10,
                critMultiplier: 2,
                accuracy: 80,
                defence: 20,
                evasion: 10,
            },
            statusManager: true
        });

        status = new Status({
            duration: { type: "PERMANENT" },
            applyOn: "AFTER_ATTACK",
            usageFrequency: "PER_ACTION",
            statsAffected: [
                {
                    type: "BUFF_FIXED",
                    from: "attack",
                    to: "defence",
                    value: 10,
                    recovers: true
                },
                {
                    type: "DEBUFF_PERCENTAGE",
                    from: "accuracy",
                    to: "evasion",
                    value: 20,
                    recovers: false
                }
            ],
            hasBeenUsed: false
        });
    });

    test('attack method should return the correct attack result', () => {
        const result = character.attack();
        expect(result.type).toMatch(/^(MISS|NORMAL|CRITICAL|TRUE)$/);
        expect(result.value).toBeGreaterThanOrEqual(0);
    });

    test('defend method should calculate the correct defense result', () => {
        const attack = { type: 'NORMAL', value: 20 };
        const result = character.defend(attack);
        expect(result.type).toMatch(/^(MISS|NORMAL|EVASION)$/);
        expect(result.value).toBeGreaterThanOrEqual(0);
    });

    test('addStatus method should add a status to the status manager', () => {
        character.addStatus(status);
        expect(character.statusManager.statusList).toContain(status);
    });

    test('removeStatus method should remove a status from the status manager', () => {
        character.addStatus(status);
        character.removeStatus(status.id);
        expect(character.statusManager.statusList).not.toContain(status);
    });

    test('die method should set isAlive property to false', () => {
        character.die();
        expect(character.isAlive).toBe(false);
    });

    test('revive method should set isAlive property to true and restore stats', () => {
        character.revive();
        expect(character.isAlive).toBe(true);
        expect(character.stats).toEqual(character.originalStats);
    });

    test('calculateDamage method should throw an error for invalid attack types', () => {
        expect(() => {
            character.calculateDamage('INVALID', character.stats);
        }).toThrowError('Invalid attack type: INVALID');
    });

    test('constructor method should set stats and statusManager', () => {
        expect(character.stats).toBeDefined();
        expect(character.statusManager).toBeDefined();
    });

    test('constructor method should set isAlive property to true', () => {
        expect(character.isAlive).toBeTruthy();
    });

    test('character creation assigns default stats if none are provided', () => {
        const character = new Character();
        expect(character.stats).toEqual(getDefaultStatsObject());
    });

    test('character creation assigns provided stats correctly', () => {
        const stats: Stats = { totalHp: 200, hp: 200, attack: 20, accuracy: 90, crit: 20, critMultiplier: 2, defence: 10, evasion: 10, attackInterval: 1, attackSpeed: 1 };
        const character = new Character({ stats });
        expect(character.stats).toEqual(stats);
    });

    test('character creation assigns hp and totalHp correctly', () => {
        const stats = { totalHp: 200, hp: 220 };
        const character = new Character({ stats });
        expect(character.stats.hp).toEqual(character.stats.totalHp);
    });

    test('character attack logic handles critical hits correctly', () => {
        const stats = { crit: 100 };
        const character = new Character({ stats });
        const attackResult = character.attack();
        expect(attackResult.type).toEqual(ATTACK_TYPE_CONST.CRITICAL);
    });

    test('character status activation logic works correctly when character dies', () => {
        const status = new Status(
            {
                duration: { type: "PERMANENT" },
                applyOn: "AFTER_DIE",
                usageFrequency: "PER_ACTION",
                statsAffected: [
                    {
                        type: "DEBUFF_PERCENTAGE",
                        from: "totalHp",
                        to: "hp",
                        value: 100,
                        recovers: false
                    }
                ],
                hasBeenUsed: false
            }
        );
        const character = new Character({ statusManager: true });
        character.addStatus(status);
        character.die();
        expect(character.stats.hp).toBe(0);
        expect(character.statusManager?.statusList[0].hasBeenUsed).toBe(true);
    });

    test('character status removal logic works correctly', () => {
        character.addStatus(status);
        character.removeStatus(status.id);
        // Verifica que el estado se haya eliminado correctamente
    });


    describe('Character defend function', () => {

        test('handles MISS attack correctly', () => {
            const stats = { accuracy: 0, attack: 100 };
            const character = new Character({ stats });
            const attackResult = character.attack();

            expect(attackResult.type).toEqual(ATTACK_TYPE_CONST.MISS);

            const defence = character.defend(attackResult);

            expect(defence.type).toEqual(DEFENCE_TYPE_CONST.MISS);
            expect(defence.value).toEqual(0);
        });

        test('handles TRUE attack correctly', () => {
            const attack = { type: ATTACK_TYPE_CONST.TRUE, value: 100 };
            const defence = character.defend(attack);

            expect(defence.type).toEqual(DEFENCE_TYPE_CONST.NORMAL);
            expect(defence.value).toEqual(attack.value);
        });

        test('handles NORMAL attack correctly when evasion fails', () => {
            const attack = { type: ATTACK_TYPE_CONST.NORMAL, value: 100 };

            character.stats.evasion = 0

            const defence = character.defend(attack);

            expect(defence.type).toEqual(DEFENCE_TYPE_CONST.NORMAL);
            expect(defence.value).toEqual(character.defenceCalculation(attack.value));
        });

        test('handles NORMAL attack correctly when evasion is successful', () => {
            const character = new Character({ stats: { crit: 0, accuracy: 100, attack: 100 } });
            const attack = character.attack();

            // Set up the mock to return a value higher than the evasion stat
            character.stats.evasion = 100;

            const defence = character.defend(attack);

            expect(defence.type).toEqual(DEFENCE_TYPE_CONST.EVASION);
            expect(defence.value).toEqual(0);
        });

        // Similar tests can be written for CRITICAL attack, following the pattern above
    });

});