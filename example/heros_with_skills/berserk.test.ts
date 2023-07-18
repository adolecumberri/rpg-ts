import { Status, Character } from '../../src/classes';
import { CharacterCallbacks } from '../../src/types';

describe('Berserk character tests', () => {
    const BERSERK_SKILL: CharacterCallbacks['receiveDamage'] = ({ c }) => {
        const rage = new Status({
            duration: { type: 'PERMANENT' },
            name: 'Rage',
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
                value: 22,
                type: 'BUFF_FIXED',
                from: 'attack', // unnnecesary.
                recovers: true,
            },
            {
                to: 'defence',
                value: -16,
                type: 'BUFF_FIXED',
                from: 'defence', // unnnecesary.
                recovers: true,
            }, {
                to: 'attackInterval',
                value: -4,
                type: 'BUFF_FIXED',
                from: 'attackInterval', // unnnecesary.
                recovers: true,
            }],
        });

        if (!c) return;

        if (
            c.stats.hp <= c!.stats.totalHp * 0.3 &&
            !c.skill.isUsed &&
            c.isAlive
        ) {
            c.statusManager?.addStatus(rage);
            c.statusManager?.activate('AFTER_RECEIVE_DAMAGE');
        }
    };

    const berserk = new Character({
        name: 'berserkkkk',
        statusManager: true,
        actionRecord: true,
        callbacks: {
            receiveDamage: BERSERK_SKILL,
        },
        skill: {
            isUsed: false,
        },
        stats: {
            hp: 100,
        },
    });

    test('Berserk skill is activated upon receiving damage', () => {
        const strongCharacter = new Character({
            stats: { attack: 80 },
        });
        const initialAttack = berserk.stats.attack;
        const initialDefence = berserk.stats.defence;
        berserk.receiveDamage(
            berserk.defend(strongCharacter.attack()),
        );
        const finalAttack = berserk.stats.attack;
        const finalDefence = berserk.stats.defence;

        expect(finalAttack).toBeGreaterThan(initialAttack);
        expect(finalDefence).toBeLessThan(initialDefence);
        expect(berserk.statusManager?.statusList.length).toBe(1);
        expect(berserk.statusManager.statusList[0].hasBeenUsed).toBe(true);

        berserk.receiveDamage(
            berserk.defend(strongCharacter.attack()),
        );
        expect(berserk.stats.hp).toBe(0); // no se baja de 0hp
        expect(berserk.stats.attack).toBe(initialAttack); // los estados se depuran correctamente.
        expect(berserk.statusManager.statusList.length).toBe(0); // los estados se depuran correctamente.
        expect(berserk.isAlive).toBe(false); // el personaje muere.
    });
});
