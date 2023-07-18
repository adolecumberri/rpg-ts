
import { uniqueID } from '../helpers';
import { AttackType, DefenceType, AttackRecord, DefenceRecord } from '../types';

class ActionRecord {
  attacks: AttackRecord[] = [];
  defences: DefenceRecord[] = [];

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
}

export default ActionRecord;

export { ActionRecord };
