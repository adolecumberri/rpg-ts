import { Character, Status } from '../src/classes';
import { getRandomInt } from '../src/helpers';
import { DefenceResult } from '../src/types';

const skillProbability = 100; // 0.6

// la skill da 30% de daño, defensa y attack_interval. cuando le pegas.


const fervorSkill = (c: Character) => {
    const fervor = new Status({
        duration: { type: 'PERMANENT' },
        name: 'Fervor',
        applyOn: 'AFTER_RECEIVE_DAMAGE',
        usageFrequency: 'ONCE',
        onAdd: (c) => {
            c.skill.isUsed = true;
        },
        onRemove: (c) => {
            c.skill.isUsed = false;
        },
        statsAffected: [{
            to: 'attack',
            value: 30,
            type: 'BUFF_PERCENTAGE',
            from: 'attack', // unnnecesary.
            recovers: true,
        },
        {
            to: 'defence',
            value: 30,
            type: 'BUFF_PERCENTAGE',
            from: 'defence', // unnnecesary.
            recovers: true,
        }, {
            to: 'attackInterval',
            value: 30,
            type: 'BUFF_PERCENTAGE',
            from: 'attackInterval', // unnnecesary.
            recovers: true,
        }],
    });

    if (
        c.skill.probability >= getRandomInt(0, 100) &&
        !c.skill.isUsed &&
        c.isAlive
    ) {
        c.statusManager?.addStatus(fervor);
        c.statusManager?.activate('AFTER_RECEIVE_DAMAGE');
    }
};

const thieve = new Character({
    name: 'Thieve',
    skill: {
        probability: skillProbability,
        use: fervorSkill,
        isUsed: false,
    },
    className: 'Thieve',
    statusManager: true,
    actionRecord: true,
    callbacks: {
        receiveDamage: ({ c }) => {
            c.skill.use(c);
        },
    },
    stats: {
        hp: 100,
        attack: 200,
        defence: 300,
        attackInterval: 10,
    },
});


describe('Thieve Character', () => {
    // Testing initial character setup.
    test('initial setup', () => {
        expect(thieve.name).toBe('Thieve');
        expect(thieve.className).toBe('Thieve');
        expect(thieve.skill.probability).toBe(skillProbability);
        expect(typeof thieve.skill.use).toBe('function');
    });

    const initialHp = thieve.stats.hp;
    const initialAttack = thieve.stats.attack;
    const initialDefense = thieve.stats.defence;
    const initialAttackInterval = thieve.stats.attackInterval;

    // Testing fervor skill.
    test('fervor skill', () => {
        thieve.receiveDamage({
            attacker: null,
            type: 'NORMAL',
            value: 20,
        });

        if (thieve.statusManager?.statusList.length) {
            expect(thieve.stats.hp).toBe(initialHp - 20);
            expect(thieve.stats.attack).toBeCloseTo(initialAttack * 1.3);
            expect(thieve.stats.defence).toBeCloseTo(initialDefense * 1.3);
            expect(thieve.stats.attackInterval).toBeCloseTo(initialAttackInterval * 1.3);
            expect(thieve.skill.isUsed).toBeTruthy();
        } else {
            expect(thieve.stats.hp).toBe(initialHp - 50);
            expect(thieve.stats.attack).toBe(initialAttack);
            expect(thieve.stats.defence).toBe(initialDefense);
            expect(thieve.stats.attackInterval).toBe(initialAttackInterval);
            expect(thieve.skill.isUsed).toBeFalsy();
        }
    });

    // Testing fervor skill is not applied twice.
    test('fervor skill not applied twice', () => {
        thieve.receiveDamage({
            attacker: null,
            type: 'NORMAL',
            value: 20,
        });

        if (thieve.statusManager?.statusList.length) {
            expect(thieve.stats.hp).toBe(initialHp - 40);
            expect(thieve.stats.attack).toBeCloseTo(initialAttack * 1.3);
            expect(thieve.stats.defence).toBeCloseTo(initialDefense * 1.3);
            expect(thieve.stats.attackInterval).toBeCloseTo(initialAttackInterval * 1.3);
        } else {
            expect(thieve.stats.hp).toBe(initialHp - 100);
            expect(thieve.stats.attack).toBe(initialAttack);
            expect(thieve.stats.defence).toBe(initialDefense);
            expect(thieve.stats.attackInterval).toBe(initialAttackInterval);
        }
    });
});
