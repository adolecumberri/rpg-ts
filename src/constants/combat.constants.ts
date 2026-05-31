import { AttackFunction, CombatBehaviorConstructor, DamageCalculation, DefenceCalculation, DefenceFunction } from "../classes/CombatBehavior";
import { Stats } from "../classes/Stats";

const ATTACK_TYPE = {
    NORMAL: 'normal',
    // MISS: 'miss',
    // CRITICAL: 'critical',
    // TRUE: 'true',
    // SKILL: 'skill',
    // MAGIC: 'magic',
    // OTHER: 'other',
} as const;

const DEFENCE_TYPE = {
    NORMAL: 'normal',
    EVASION: 'evasion',
    MISS: 'miss',
    TRUE: 'true',
    SKILL: 'skill',
} as const;

const DEFAULT_ATTACK_FUNCTION: AttackFunction = (character) => {
    return {
        type: ATTACK_TYPE.NORMAL,
        value: DEFAULT_DAMAGE_CALCULATION(character.stats),
    };
};

const DEFAULT_DAMAGE_CALCULATION: DamageCalculation = (stats: Stats) => stats.attack;

const DEFAULT_DEFENCE_FUNCTION: DefenceFunction = (character, attack) => ({
    type: DEFENCE_TYPE.NORMAL,
    value: DEFAULT_DEFENCE_CALCULATION(attack.value, character.stats),
});

const DEFAULT_DEFENCE_CALCULATION: DefenceCalculation = (incoming: number, stats: Stats) => {
    const defence = stats.defence;
    return Math.max(0, incoming - defence);
};

const DEFAULT_COMBAT_BEHAVIOR_CONFIG: CombatBehaviorConstructor = {
    attack: DEFAULT_ATTACK_FUNCTION,
    damageCalculation: DEFAULT_DAMAGE_CALCULATION,
    defence: DEFAULT_DEFENCE_FUNCTION,
    defenceCalculation: DEFAULT_DEFENCE_CALCULATION,
};

export {
    ATTACK_TYPE,
    DEFENCE_TYPE,
    DEFAULT_COMBAT_BEHAVIOR_CONFIG,
};
