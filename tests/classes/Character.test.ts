// Character.test.js

import Character from '../../src/classes/Character';
import Status from '../../src/classes/Status';

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
});
