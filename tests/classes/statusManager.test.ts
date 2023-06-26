import Character from "../../src/classes/Character";
import Status from "../../src/classes/Status";
import StatusManager from "../../src/classes/StatusManager";


describe('status', () => {

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

    test('constructor method should correctly set properties', () => {
        const character = new Character({});
        const statusManager = new StatusManager({ character });
        expect(statusManager.character).toBe(character);
    });

    test('activate method should correctly activate status', () => {
        character.addStatus(status);
        character.statusManager.activate('AFTER_ATTACK');
        expect(character.stats.defence).toBeGreaterThan(10);  // Asumiendo que la defensa original fue 10.
        expect(character.stats.evasion).toBeLessThan(10);  // Asumiendo que la evasión original fue 10.
    });

    it('should add isDinamicImportWorking property to StatusManager', () => {
        const statusManager = new StatusManager({
            isDinamicImportWorking: true,
        });
        expect(statusManager.isDinamicImportWorking).toBeTruthy();
    });

});
