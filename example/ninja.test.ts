import { Character } from '../src/classes';
import { ATTACK_TYPE_CONST } from '../src/constants';
import { getRandomInt } from '../src/helpers';
import { AttackResult, Stats } from '../src/types';

const skillProbability = 100; // 19 real probability.

const tripleAttack = ({ atacker, value }: AttackResult) => {
    if ( !atacker ) return undefined;
    if ( atacker!.skill.probability < getRandomInt() ) return undefined;
    const results: AttackResult = { type: ATTACK_TYPE_CONST.SKILL, value: 0, atacker };

    for (let i = 0; i < 3; i++) {
        const accuracyRoll = getRandomInt(); // Genera un número entre 0 y 100.
        const critRoll = getRandomInt(); // Genera un número entre 0 y 100.

        let newAttackValue = 0;

        if (atacker.stats.accuracy < accuracyRoll ) {
            newAttackValue = atacker.calculateDamage('MISS', atacker.stats);
        } else if (atacker!.stats.crit > critRoll) {
            newAttackValue = atacker.calculateDamage('CRITICAL', atacker.stats);
        } else {
            newAttackValue = atacker.calculateDamage('NORMAL', atacker.stats);
        }

        results.value += newAttackValue * 0.7;
    }
    return results;
};

const ninja = new Character({
    name: 'Ninja',
    className: 'Ninja',
    statusManager: true,
    actionRecord: true,
    skill: {
        probability: skillProbability,
        use: tripleAttack,
    },
    callbacks: {
        afterAnyAttack: tripleAttack,
    },
    stats: {
        attack: 10,
        accuracy: 100,
    },
});

describe('Ninja Character', () => {
    // Testing initial character setup.
    test('initial setup', () => {
        expect(ninja.name).toBe('Ninja');
        expect(ninja.className).toBe('Ninja');
        expect(ninja.skill.probability).toBe(skillProbability);
        expect(typeof ninja.skill.use).toBe('function');
    });

    // Testing triple attack skill.
    test('triple attack skill', () => {
        // This part may vary depending on how you set up your character's stats, and what values are expected.
        const initialHp = 100; // Replace this with the actual initial HP of the character being attacked.

        // Dummy opponent for the Ninja to attack.
        const dummyOpponent = new Character({ name: 'Dummy', stats: { hp: initialHp } });

        // Make Ninja attack the dummy opponent using the skill.
        const attackResults = ninja.attack();

        if (attackResults) {
            // Make the dummy opponent defend from the attack.
            const defenceResult = dummyOpponent.defend(attackResults);

            dummyOpponent.receiveDamage(defenceResult);

            // Check that the attack was successful and the dummy opponent received damage.
            // Adjust these checks as needed based on the expected attack values.
            expect(dummyOpponent.stats.hp).toBeLessThan(initialHp);
            expect(attackResults.type).toBe(ATTACK_TYPE_CONST.SKILL);
            expect(attackResults.value).toBeGreaterThan(0);
        } else {
            // In case the skill didn't activate, the HP of the dummy opponent should remain the same.
            expect(dummyOpponent.stats.hp).toBe(initialHp);
        }
    });
});
