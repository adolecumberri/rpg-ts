import M from "../constants/messages";
import { Stats } from "../interfaces";

type IChecks = {
    [x in keyof Stats | "duration"]: {
        isWrong: (value: any) => boolean;
        errorMessage: string;
    };
};

const CHECKS = {
    accuracy: {
        isWrong: (value: number) => value < 0 || value > 100,
        errorMessage: M.errors.out_of_bounds.between_thousand_and_zero("accuracy"),
    },
    attack: {
        isWrong: (value: number) => value < 1,
        errorMessage: M.errors.out_of_bounds.lower_than_one("attack"),
    },
    attack_interval: {
        //bigger === lower
        isWrong: (value: number) => value < 1,
        errorMessage: M.errors.out_of_bounds.lower_than_one("Attack Interval"),
    },
    attack_speed: {
        // bigger === faster
        isWrong: (value: number) => value < 1,
        errorMessage: M.errors.out_of_bounds.lower_than_one("Attack Speed"),
    },
    crit: {
        isWrong: (value: number) => value < 0 || value > 100,
        errorMessage: M.errors.out_of_bounds.between_thousand_and_zero("crit"),
    },
    crit_multiplier: {
        isWrong: (value: number) => value < 1,
        errorMessage: M.errors.out_of_bounds.lower_than_one("Critical Damage"),
    },
    total_hp: {
        isWrong: (value: number) => value < 0,
        errorMessage: M.errors.out_of_bounds.lower_than_zero("Current HP"),
    },
    defence: {
        isWrong: (value: number) => isNaN(parseInt(value as unknown as string)),
        errorMessage: "",
    },
    duration: {
        isWrong: (value: number) => value < 0,
        errorMessage: M.errors.out_of_bounds.lower_than_zero("Duration"),
    },
    evasion: {
        isWrong: (value: number) => value < 0 || value > 100,
        errorMessage: M.errors.out_of_bounds.between_thousand_and_zero("evasion"),
    },
    hp: {
        isWrong: (value: number) => value < 0,
        errorMessage: M.errors.out_of_bounds.lower_than_zero("HP"),
    },
};

const checkAccuracy = (val: number) => {
    if (CHECKS.accuracy.isWrong(val)) throw new Error(CHECKS.accuracy.errorMessage);
};
const checkAttack = (val: number) => {
    if (CHECKS.attack.isWrong(val)) throw new Error(CHECKS.attack.errorMessage);
};
const checkAttack_interval = (val: number) => {
    if (CHECKS.attack_interval.isWrong(val)) throw new Error(CHECKS.attack_interval.errorMessage);
};
const checkAttack_speed = (val: number) => {
    if (CHECKS.attack_speed.isWrong(val)) throw new Error(CHECKS.attack_speed.errorMessage);
};
const checkCrit = (val: number) => {
    if (CHECKS.crit.isWrong(val)) throw new Error(CHECKS.crit.errorMessage);
};
const checkCrit_multiplier = (val: number) => {
    if (CHECKS.crit_multiplier.isWrong(val)) throw new Error(CHECKS.crit_multiplier.errorMessage);
};
const checkTotal_hp = (val: number) => {
    if (CHECKS.total_hp.isWrong(val)) throw new Error(CHECKS.total_hp.errorMessage);
};
const checkDefence = (val: number) => {
    if (CHECKS.defence.isWrong(val)) throw new Error(CHECKS.defence.errorMessage);
};
const checkDuration = (val: number) => {
    if (CHECKS.duration.isWrong(val)) throw new Error(CHECKS.duration.errorMessage);
};
const checkEvasion = (val: number) => {
    if (CHECKS.evasion.isWrong(val)) throw new Error(CHECKS.evasion.errorMessage);
};
const checkHp = (val: number) => {
    if (CHECKS.hp.isWrong(val)) throw new Error(CHECKS.hp.errorMessage);
};

const checkStatsBounds = (stats: Partial<Stats>) => {
    // true === error.
    // false === correct

    for (const key in stats) {
        if (CHECKS[key] && CHECKS[key].isWrong(stats[key])) {
            throw new Error(CHECKS[key].errorMessage);
        }
    }
};

export {
    checkAccuracy,
    checkAttack,
    checkAttack_interval,
    checkAttack_speed,
    checkCrit,
    checkCrit_multiplier,
    checkTotal_hp,
    checkDefence,
    checkDuration,
    checkEvasion,
    checkHp,
    checkStatsBounds,
};
