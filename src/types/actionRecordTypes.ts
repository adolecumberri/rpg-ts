import { AttackType, DefenceType } from '.';

interface CommonRecord {
    id: number,
    characterId: number,
}

type AttackRecord = {
    attackType: AttackType,
    damage: number,
} & CommonRecord;

type DefenceRecord = {
    defenceType: DefenceType,
    damageReceived: number,
} & CommonRecord;

export {
    AttackRecord,
    DefenceRecord,
};
