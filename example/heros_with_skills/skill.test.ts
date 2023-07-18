import { Character, Status } from '../../src/classes';
import { getRandomInt } from '../../src/helpers';
import { AttackResult, CharacterCallbacks } from '../../src/types';

const haste = (c: Character) => {
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

    console.log('hasteId', hasteStatus.id);

    if (c.skill.probability >= getRandomInt(0, 100) && !c.skill.isUsed) {
        c.statusManager?.addStatus(hasteStatus, c);
        c.skill.isUsed = true;
        // c.statusManager?.activate('AFTER_ATTACK');
    } else if (c.statusManager?.statusList.includes(hasteStatus)) {
         c.statusManager?.removeStatusById(hasteStatus.id, c); //
         c.skill.isUsed = false;
    }
};

const archer_skill = ({atacker}: AttackResult) => {
    atacker?.skill.use(atacker);
};

describe('Archer test to check what happens with the status ID and objects.', () => {
    test('haste gesture skill get correct ID', () => {
        const archerA = new Character({
            name: 'Archer',
            skill: {
                probability: 100,
                use: haste,
                isUsed: false,
            },
            className: 'Archer',
            statusManager: true,
            actionRecord: true,
            callbacks: {
                criticalAttack: archer_skill,
                normalAttack: archer_skill,
            } as CharacterCallbacks,
        });

        const archerB = new Character({
            name: 'Archer',
            skill: {
                probability: 100,
                use: haste,
                isUsed: false,
            },
            className: 'Archer',
            statusManager: true,
            actionRecord: true,
            callbacks: {
                criticalAttack: archer_skill,
                normalAttack: archer_skill,
            } as CharacterCallbacks,
        });

        archerA.attack();
        archerA.attack();
        archerB.attack();
    });
});
