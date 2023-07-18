import { Character, Status } from '../../src/classes';
import { getRandomInt } from '../../src/helpers';
import { CharacterCallbacks } from '../../src/types';

const SKILL_PROBABILITY = 100; // 0.23 es lo correcto.

const shieldGesture = new Status({
    duration: { type: 'TEMPORAL', value: 3 },
    name: 'Haste',
    applyOn: 'AFTER_TURN',
    usageFrequency: 'ONCE',
    statsAffected: [{
        to: 'defence',
        value: 18,
        type: 'BUFF_FIXED',
        from: 'defence', // unnnecesary.
        recovers: true,
    }],
    onAdd: (c) => {
        c.skill.isUsed = true;
    },
    onRemove: (c) => {
        c.skill.isUsed = false;
    },
});

const soldierSkill: CharacterCallbacks['afterTurn'] = (c)=> {
    if (
        c.skill.probability >= getRandomInt(0, 100) &&
        c.isAlive &&
        !c.skill.isUsed
    ) {
        c.statusManager?.addStatus(shieldGesture);
    }
};

const soldier = new Character({
    name: 'Soldier',
    skill: {
        probability: SKILL_PROBABILITY,
        use: soldierSkill,
        isUsed: false,
    },
    className: 'Soldier',
    statusManager: true,
    actionRecord: true,
    callbacks: {
        afterTurn: (c) => {
            c.skill.use(c);
        },
    },
});

describe('Soldier Character', () => {
    // Testing initial character setup.
    test('initial setup', () => {
        expect(soldier.name).toBe('Soldier');
        expect(soldier.className).toBe('Soldier');
        expect(soldier.skill.probability).toBe(SKILL_PROBABILITY);
        expect(typeof soldier.skill.use).toBe('function');
    });

    // Testing shield gesture skill.
    test('shield gesture skill', () => {
        // This part may vary depending on how you set up your character's stats, and what values are expected.
        const initialDefense = 20; // Replace this with the actual initial Defense of the character.

        soldier.stats.defence = initialDefense;

        // Apply the skill after turn
        soldierSkill(soldier);
        soldier.afterTurn();

        if (soldier.statusManager?.hasStatus(shieldGesture.id)) {
            // Check that the status is added correctly and has an effect on the character's defense.
            // Adjust these checks as needed based on the expected defense values.
            expect(soldier.stats.defence).toBe(initialDefense + shieldGesture.statsAffected[0].value);
        } else {
            // In case the skill didn't activate, the defense of the character should remain the same.
            expect(soldier.stats.defence).toBe(initialDefense);
        }
    });
});
