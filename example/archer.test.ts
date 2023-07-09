import { AttackResult, CharacterCallbacks, StatusDurationTemporal } from '../src/types';
import { Character, Status } from './../src/classes';


describe('arquero', () => {
    test('archer with the "haste" skill.', () => {
        // haste will reduce the attack interval by 2 for 1 turn.
        // after the attack, the status will be removed and the original attack Interval will be restored.
        const haste = new Status({
            duration: { type: 'TEMPORAL', value: 1 },
            name: 'Haste',
            applyOn: 'AFTER_ATTACK',
            statsAffected: [{
                to: 'attackInterval',
                value: 2,
                type: 'DEBUFF_FIXED',
                from: 'attackInterval', // unnnecesary.
                recovers: true,
            }],
        });

        const ARCHER_SKILL_PROBABILITY = 1;
        let skillUsed = false;

        const archer = new Character({
            name: 'Archer',
            skillProbability: ARCHER_SKILL_PROBABILITY,
            className: 'Archer',
            statusManager: true,
            actionRecord: true,
            callbacks: {
                criticalAttack: ({ atacker }: AttackResult) => {
                    if (!skillUsed) {
                        atacker!.statusManager?.addStatus(haste);
                        skillUsed = !skillUsed;
                    } else {
                        atacker!.statusManager?.removeStatusById(haste.id);
                        skillUsed = !skillUsed;
                    }
                },
                normalAttack: ({ atacker }: AttackResult) => {
                    if (!skillUsed) {
                        atacker!.statusManager?.addStatus(haste);
                        skillUsed = !skillUsed;
                    } else {
                        atacker!.statusManager?.removeStatusById(haste.id);
                        skillUsed = !skillUsed;
                    }
                },
            } as CharacterCallbacks,
            stats: {
                attackInterval: 3,
            },
        });

        archer.attack(); // se ejecuta Haste y le reduce el attack interval -2
        console.log(archer.statusManager.statusList[0]);
        expect(archer.stats.attackInterval).toBe(1);
        expect(archer.statusManager.statusList.length).toBe(1);
        expect((archer.statusManager.statusList[0].duration as StatusDurationTemporal).value).toBe(0);

        archer.attack(); // se ejecuta Haste y le reduce el attack interval -2
        expect(archer.statusManager.statusList.length).toBe(0);
        expect(archer.stats.attackInterval).toBe(3);
    });
});
