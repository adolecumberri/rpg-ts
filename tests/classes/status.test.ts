import Character from "../../src/classes/Character";
import Status from "../../src/classes/Status";

describe('status', () => {

    let character: Character;
    let status: Status;
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
            name: "test",
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


    test('activate method should correctly apply buffs and debuffs', () => {
        const originalStats = { ...character.stats };
        status.activate(character);
        console.log('A', character.stats)
        console.log('B', originalStats)
        expect(character.stats.defence).toBeGreaterThan(originalStats.defence);
        expect(character.stats.evasion).toBeLessThan(originalStats.evasion);
    });

    test('recover method should correctly recover character stats', () => {
        console.log(character.stats);

        status.activate(character);

        console.log(character.stats);

        const modifiedStats = { ...character.stats };
        status.recover(character);
        expect(character.stats.defence).toBeLessThan(modifiedStats.defence);
    });

    test('constructor method should set an id to the status', () => {
        expect(status.id).toBeDefined();
    });

    test('constructor method should correctly set properties', () => {
        const status = new Status({
            duration: { type: "PERMANENT" },
            applyOn: "AFTER_ATTACK",
            usageFrequency: "PER_ACTION",
            statsAffected: [],
            hasBeenUsed: false
        });
        expect(status.duration.type).toBe('PERMANENT');
        expect(status.applyOn).toBe('AFTER_ATTACK');
        expect(status.usageFrequency).toBe('PER_ACTION');
        expect(status.statsAffected).toEqual([]);
        expect(status.hasBeenUsed).toBeFalsy();
    });

    it('should add isDinamicImportWorking property to Status', () => {
        const status = new Status({
            isDinamicImportWorking: true,
        });
        expect(status.isDinamicImportWorking).toBeTruthy();
    });

})
