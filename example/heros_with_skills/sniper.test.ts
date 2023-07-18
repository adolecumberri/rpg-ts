import { Character } from '../../src/classes';
import { getRandomInt } from '../../src/helpers';
import { CharacterCallbacks } from '../../src/types';

const skillProbability = 100; // 75%

const unoticedShot: CharacterCallbacks['beforeBattle'] = (c) => {
    if (
    skillProbability >= getRandomInt(0, 100) &&
    !c.skill.isUsed
    ) {
        c!.skill.isUsed = true;
        return c.attack();
    }
};

const sniper = new Character({
    name: 'Sniper',
    className: 'Sniper',
    skill: {
        probability: skillProbability,
        use: unoticedShot,
        isUsed: false,
    },
    statusManager: true,
    actionRecord: true,
    callbacks: {
        beforeBattle: unoticedShot,
        afterBattle: (c) => {
            c.skill.isUsed = false;
        },
    },
});

import { jest } from '@jest/globals';

describe('Sniper Character', () => {
    // Testing initial character setup.
    test('initial setup', () => {
        expect(sniper.name).toBe('Sniper');
        expect(sniper.className).toBe('Sniper');
        expect(sniper.skill.probability).toBe(skillProbability);
        expect(typeof sniper.skill.use).toBe('function');
        expect(sniper.skill.isUsed).toBeFalsy();
    });

    // Testing unoticedShot skill.
    test('unoticedShot skill', () => {
        // suppose we have a mock enemy
        const enemy = new Character();
        const initialEnemyHp = enemy.stats.hp;

        const attack = sniper.beforeBattle();
        enemy.receiveDamage(attack);

        if (sniper.skill.isUsed) {
            expect(enemy.stats.hp).toBeLessThan(initialEnemyHp);
        } else {
            expect(enemy.stats.hp).toBe(initialEnemyHp);
        }
    });
});
