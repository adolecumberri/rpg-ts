import { Character } from '../../src/classes/Character';
import { getRandomInt } from '../../src/helpers';
import { CharacterCallbacks } from '../../src/types';

const SKILL_PROBABILITY = 100; // 23 es el valor real.

// cura de 30 a 40% de la vida si el personaje tiene menos del 30%
const holyLight: CharacterCallbacks['afterTurn'] = (c) => {
    if (
        c!.stats.hp <= c!.stats.totalHp * 0.3 &&
        c!.skill.probability >= getRandomInt(0, 100) &&
        c!.isAlive
    ) {
        c!.updateHp(getRandomInt(
            c!.stats.totalHp * 0.3,
            c!.stats.totalHp * 0.4,
        ));
    }
};

const paladin = new Character({
    name: 'Paladin',
    skill: {
        probability: SKILL_PROBABILITY,
        use: holyLight,
    },
    className: 'Paladin',
    statusManager: true,
    actionRecord: true,
    stats: {
        hp: 100,
    },
    callback: {
        afterTurn: holyLight,
    },
});

describe('Paladin Character', () => {
    // Testing initial character setup.
    test('initial setup', () => {
        expect(paladin.name).toBe('Paladin');
        expect(paladin.className).toBe('Paladin');
        expect(paladin.skill.probability).toBe(SKILL_PROBABILITY);
        expect(typeof paladin.skill.use).toBe('function');
    });

    // Testing holy light skill.
    test('holy light skill', () => {
        const fake_atacker = new Character({stats: { attack: 80 }});
        console.log(fake_atacker.stats);
        const fake_attack = fake_atacker.attack();
        // Reduces the paladin's HP to less than 30% of total HP.
        const defence = paladin.defend(fake_attack);

        // Checks if HP is less than 30% of total HP.
        expect(defence.value).toBeLessThan(paladin.stats.totalHp);

        paladin.receiveDamage(defence);

        // siendo 100% la probabilidad de usar la skill
        // el paladin debe tener + de 20 de vida (100 de su vida - 80 del golpe)

        expect(paladin.stats.hp).toBe(20);
    });
});
