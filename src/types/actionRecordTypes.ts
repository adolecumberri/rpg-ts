import { AttackType, DefenceType, Stats } from '.';

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
    attackerId: number,
} & CommonRecord;

type TotalActionRecord = {
    characterId: number;
    stats: any;
    attacks: {
        value: number;
        total: number;
        NORMAL: number;
        CRITICAL: number;
        MISS: number;
        SKILL: number;
        TRUE: number;
    };
    defences: {
        value: number;
        total: number;
        NORMAL: number;
        EVASION: number;
        MISS: number;
        SKILL: number;
        TRUE: number;
    };
};

export {
    AttackRecord,
    DefenceRecord,
    TotalActionRecord,
};
