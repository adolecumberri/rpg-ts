import { AttackType, DefenceType } from '.';

type attackRecord = {
    attackType: AttackType,
    damage: number,
    time: number
};

type defenceRecord = {
    defenceType: DefenceType,
    damageReceived: number,
    time: number
};

export {
    attackRecord,
    defenceRecord,
};
