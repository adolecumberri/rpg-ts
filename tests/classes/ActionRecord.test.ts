import { Character } from '../../src/classes';
import ActionRecord from '../../src/classes/ActionRecord';
import { AttackType, DefenceType, AttackRecord, DefenceRecord } from '../../src/types';

describe('Check if Action Record stores attacks', () => {
    let character;
    let character2;

    beforeAll(() => {
        character = new Character({
            id: 1,
            name: 'John',
            stats: {
                totalHp: 100,
                hp: 100,
                attack: 10,
                crit: 100,
                critMultiplier: 2,
                accuracy: 100,
                defence: 0,
                evasion: 10,
            },
            statusManager: true,
        });
        character2 = new Character({
            id: 1,
            name: 'John',
            stats: {
                totalHp: 100,
                hp: 100,
                attack: 10,
                crit: 0,
                critMultiplier: 2,
                accuracy: 100,
                defence: 0,
                evasion: 10,
            },
            statusManager: true,
        });
    });

    test( 'raw Action Record', ( )=> {
        let actionRecord: ActionRecord;
    });
});


describe('ActionRecord', () => {
  let actionRecord: ActionRecord;

  beforeEach(() => {
    actionRecord = new ActionRecord();
  });

  test('should record attack', () => {
    const attackType: AttackType = 'NORMAL';
    const damage = 10;

    actionRecord.recordAttack(attackType, damage, 0);

    expect(actionRecord.attacks.length).toBe(1);

    const recordedAttack: AttackRecord = actionRecord.attacks[0];

    expect(recordedAttack.attackType).toBe(attackType);
    expect(recordedAttack.damage).toBe(damage);
    expect(typeof recordedAttack.id).toBe('number');
  });

  test('should record defence', () => {
    const defenceType: DefenceType = 'NORMAL';
    const damageReceived = 5;

    actionRecord.recordDefence(defenceType, damageReceived, 0);

    expect(actionRecord.defences.length).toBe(1);

    const recordedDefence: DefenceRecord = actionRecord.defences[0];

    expect(recordedDefence.defenceType).toBe(defenceType);
    expect(recordedDefence.damageReceived).toBe(damageReceived);
    expect(typeof recordedDefence.id).toBe('number');
  });
});

