import { getRandomInt } from '../src/helpers';
import { AttackResult, CharacterCallbacks, StatusDurationTemporal } from '../src/types';
import { Character, Status } from './../src/classes';


describe('arquero', () => {
    test('archer with the "haste" skill.', () => {
        // haste will reduce the attack interval by 2 for 1 turn.
        // after the attack, the status will be removed and the original attack Interval will be restored.
        const hasteStatus = new Status({
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

        const haste = (c: Character) => {
            if (c.skill.probability >= getRandomInt(0, 100) && !c.skill.used) {
                c.statusManager?.addStatus(hasteStatus);
                c.skill.used = true;
                // c.statusManager?.activate('AFTER_ATTACK');
            } else if (c.statusManager?.statusList.includes(hasteStatus)) {
                 c.statusManager?.removeStatusById(hasteStatus.id); //
                 c.skill.used = false;
            }
        };

        const archer_skill = ({atacker}: AttackResult) => {
            atacker?.skill.use(atacker);
        };

        const ARCHER_SKILL_PROBABILITY = 100;

        const archer = new Character({
            name: 'Archer',
            skill: {
                probability: ARCHER_SKILL_PROBABILITY,
                use: haste,
                used: false,
            },
            className: 'Archer',
            statusManager: true,
            actionRecord: true,
            callbacks: {
                criticalAttack: archer_skill,
                normalAttack: archer_skill,
            } as CharacterCallbacks,
            stats: {
                attackInterval: 3,
            },
        });

        archer.attack(); // se ejecuta Haste y le reduce el attack interval -2
        expect(archer.stats.attackInterval).toBe(1);
        expect(archer.statusManager.statusList.length).toBe(1);
        expect((archer.statusManager.statusList[0].duration as StatusDurationTemporal).value).toBe(0);

        archer.attack(); // se ejecuta Haste y le reduce el attack interval -2
        expect(archer.statusManager.statusList.length).toBe(0);
        expect(archer.stats.attackInterval).toBe(3);
    });
});
