import { createDefaultObjectGetter } from './common.helpers';
import { DEFAULT_ATTACK_OBJECT, DEFAULT_DEFENCE_OBJECT } from '../constants/character.constants';
import { AttackResult, DefenceResult } from '../types/Character.types';

const getDefaultAttackObject = createDefaultObjectGetter<AttackResult>(DEFAULT_ATTACK_OBJECT);
const getDefaultDefenceObject = createDefaultObjectGetter<DefenceResult>(DEFAULT_DEFENCE_OBJECT);
export {
    getDefaultAttackObject,
    getDefaultDefenceObject,
};
