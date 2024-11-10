
import { ATTACK_TYPE } from '../common/common.constants';
import { AttackResult, DamageCalculation } from './character.types';
import { Stats } from './components';

const DEFAULT_ATTACK_OBJECT: AttackResult = {
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

const DEFAULT_ATTACK_CALCULATION: DamageCalculation = {
    [ATTACK_TYPE.CRITICAL]: (stats: Stats<{critMultiplier: number}>) => stats.attack * (1 + stats.),
    [ATTACK_TYPE.NORMAL]: (stats: Stats) => stats.attack,
    [ATTACK_TYPE.MISS]: () => 0,
};

export {
    DEFAULT_ATTACK_OBJECT,
    DEFAULT_ATTACK_CALCULATION,
};
