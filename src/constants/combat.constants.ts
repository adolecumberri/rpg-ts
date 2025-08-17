import { Stats } from '../Classes/Stats';
import { AttackFunction, CombatBehaviorConstructor, DamageCalculation, DefenceCalculation, DefenceFunction } from '../types/combat.types';

// TODO: abrir a actualizaciones en caliente.
const ATTACK_TYPE = {
    NORMAL: 'normal',
    MISS: 'miss',
    CRITICAL: 'critical',
    TRUE: 'true',
    SKILL: 'skill',
    MAGIC: 'magic',
    OTHER: 'other',
} as const;

const DEFENCE_TYPE = {
    NORMAL: 'normal',
    EVASION: 'evasion',
    MISS: 'miss',
    TRUE: 'true',
    SKILL: 'skill',
} as const;

const DEFAULT_ATTACK_FUNCTION: AttackFunction = (char) => {
    return {
        type: ATTACK_TYPE.NORMAL,
        value: char.stats.getProp('attack'),
    };
};

const DEFAULT_DAMAGE_CALCULATION: DamageCalculation = {
    [ATTACK_TYPE.NORMAL]: (stats: Stats<any>) => stats.getProp('attack'),
    [ATTACK_TYPE.MISS]: () => 0,
    [ATTACK_TYPE.CRITICAL]: (stats: Stats<any>) => Math.floor(stats.getProp('attack') * 1.75),
    [ATTACK_TYPE.TRUE]: (stats: Stats<any>) => stats.getProp('attack'),
    [ATTACK_TYPE.SKILL]: (stats: Stats<any>) => stats.getProp('attack') + 10,
    [ATTACK_TYPE.MAGIC]: (stats: Stats<any>) => stats.getProp('attack') + 5,
    [ATTACK_TYPE.OTHER]: () => 1,
};

const DEFAULT_DEFENCE_FUNCTION: DefenceFunction = (char, attack) => ({
    type: DEFENCE_TYPE.NORMAL,
    value: Math.min(0, char.stats.getProp('defence') - attack.value),
});

const DEFAULT_DEFENCE_CALCULATION: DefenceCalculation = (incoming: number, stats: Stats<any>) => {
    const defence = stats.getProp('defence');
    return Math.max(0, incoming - defence);
};

const DEFAULT_COMBAT_BEHAVIOR_CONFIG: CombatBehaviorConstructor = {
    attackFn: DEFAULT_ATTACK_FUNCTION,
    damageCalc: DEFAULT_DAMAGE_CALCULATION,
    defenceFn: DEFAULT_DEFENCE_FUNCTION,
    defenceCalc: DEFAULT_DEFENCE_CALCULATION,
    emitter: undefined,
};

export {
    ATTACK_TYPE,
    DEFENCE_TYPE,
    DEFAULT_COMBAT_BEHAVIOR_CONFIG,
};
