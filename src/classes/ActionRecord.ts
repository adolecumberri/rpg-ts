
import { Character } from '.';
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from '../constants';
import { uniqueID } from '../helpers';
import { AttackType, DefenceType, AttackRecord, DefenceRecord, TotalActionRecord } from '../types';

class ActionRecord {
  attacks: AttackRecord[] = [];
  defences: DefenceRecord[] = [];

  static deserialize(data) {
    const serializedData = JSON.parse(data);
    const actionRecord = new ActionRecord();
    actionRecord.attacks = serializedData.attacks;
    actionRecord.defences = serializedData.defences;
    return actionRecord;
  }

  getTotalStats(c: Character): TotalActionRecord {
    if (!c) throw new Error('Character ID is required');

    const solution: TotalActionRecord = {
      characterId: c.id,
      stats: c.stats,
      attacks: {
        value: 0,
        total: 0,
        [ATTACK_TYPE_CONST.CRITICAL]: 0,
        [ATTACK_TYPE_CONST.NORMAL]: 0,
        [ATTACK_TYPE_CONST.MISS]: 0,
        [ATTACK_TYPE_CONST.SKILL]: 0,
        [ATTACK_TYPE_CONST.TRUE]: 0,
      },
      defences: {
        value: 0,
        total: 0,
        [DEFENCE_TYPE_CONST.NORMAL]: 0,
        [DEFENCE_TYPE_CONST.MISS]: 0,
        [DEFENCE_TYPE_CONST.EVASION]: 0,
        [DEFENCE_TYPE_CONST.SKILL]: 0,
        [DEFENCE_TYPE_CONST.TRUE]: 0,
      },
    };

    this.attacks.forEach((attack) => {
      if (attack.characterId !== c.id) return;
      solution.attacks.value += attack.damage;
      solution.attacks.total += 1;
      solution.attacks[attack.attackType] += 1;
    });

    this.defences.forEach((defence) => {
      if (defence.characterId !== c.id) return;
      solution.defences.value += defence.damageReceived;
      solution.defences.total += 1;
      solution.defences[defence.defenceType] += 1;
    });

    return solution;
  }

  recordAttack(attackType: AttackType, damage: number, characterId: number) {
    const attack: AttackRecord = {
      id: uniqueID(),
      attackType,
      damage,
      characterId,
    };
    this.attacks.push(attack);

    return attack.id;
  }

  recordDefence(defenceType: DefenceType, damageReceived: number, characterId: number) {
    const defence: DefenceRecord = {
      id: uniqueID(),
      defenceType,
      damageReceived,
      characterId,
    };
    this.defences.push(defence);

    return defence.id;
  }

  serialize() {
    return JSON.stringify({
      attacks: this.attacks,
      defences: this.defences,
    });
  }
}

export default ActionRecord;

export { ActionRecord };
