import { AttackObject, DefenceObject, Stats } from "../interfaces";
import discriminators from "./discriminators";
import { ATTACK_TYPE, DEFENCE_TYPE } from "./types";

export const DEFAULT_ATTACK_OBJECT: AttackObject = {
    discriminator: discriminators.ATTACK_OBJECT,
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

export const DEFAULT_DEFENCE_OBJECT: DefenceObject = {
    discriminator: discriminators.DEFENCE_OBJECT,
    type: DEFENCE_TYPE.NORMAL,
    value: 0,
};

export const DEFAULT_STATS_OBJECT: Partial<Stats> = {
    accuracy: 100,
    attack: 1,
    evasion: 0,
    total_hp: 0,
    defence: 0,
    hp: 0,
    crit: 0,
    crit_multiplier: 1,
    discriminator: discriminators.STATS
}

// export const DEFENCE_EVASION_OBJECT: DefenceObject = {
//     discriminator: discriminators.DEFENCE_OBJECT,
//     type: "evasion",
//     value: 0,
// };
