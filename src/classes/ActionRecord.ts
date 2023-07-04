import { AttackType, DefenceType } from '../types';
import { attackRecord, defenceRecord } from '../types/actionRecordTypes';

class ActionRecord {
    attacks: attackRecord[] = [];
    defences: defenceRecord[] = [];

    recordAttack(attackType: AttackType, damage: number) {
        this.attacks.push({
            attackType,
            damage,
            time: Date.now(), // Guarda el tiempo actual para referencia
        });
    }

    recordDefence(defenceType: DefenceType, damageReceived: number) {
        this.defences.push({
            defenceType,
            damageReceived,
            time: Date.now(), // Guarda el tiempo actual para referencia
        });
    }
}

export default ActionRecord;

export {
    ActionRecord,
};
