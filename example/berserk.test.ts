import { Status, Character } from '../src/classes';

describe('Berserk character tests', () => {
    const Rage = new Status({
        duration: { type: 'PERMANENT' },
        name: 'Rage',
        applyOn: 'AFTER_RECEIVE_DAMAGE',
        usageFrequency: 'ONCE',
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

    const BERSERK_SKILL = (character: Character) => {
        if (
            character.stats.hp <= character.stats.totalHp * 0.3 &&
            !character.statusManager?.statusList.includes(Rage)
        ) {
            character.statusManager?.addStatus(Rage);
            character.statusManager?.activate('AFTER_RECEIVE_DAMAGE');
        }
    };


    const berserk = new Character({
            name: 'berserkkkk',
            statusManager: true,
            actionRecord: true,
            callbacks: {
                receiveDamage: BERSERK_SKILL,
            },
            stats: {
                hp: 100,
            },
        });

    test('Berserk skill is activated upon receiving damage', () => {
      const initialAttack = berserk.stats.attack;
      const initialDefence = berserk.stats.defence;
      debugger;
      berserk.receiveDamage(80);
      const finalAttack = berserk.stats.attack;
        const finalDefence = berserk.stats.defence;

      expect(finalAttack).toBeGreaterThan(initialAttack);
      expect(finalDefence).toBeLessThan(initialDefence);
      expect(berserk.statusManager?.statusList).toContain(Rage);
      expect(berserk.statusManager.statusList[0].hasBeenUsed).toBe(true);
    });
  });
