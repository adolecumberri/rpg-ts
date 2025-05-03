import { createDefaultObjectGetter } from '../helpers/common.helpers';
import { DEFAULT_ATTACK_OBJECT, DEFAULT_DEFENCE_OBJECT } from './character.constants';
import { AttackResult, DefenceResult } from './character.types';

const getDefaultAttackObject = createDefaultObjectGetter<AttackResult>(DEFAULT_ATTACK_OBJECT);
const getDefaultDefenceObject = createDefaultObjectGetter<DefenceResult>(DEFAULT_DEFENCE_OBJECT);
export {
    getDefaultAttackObject,
    getDefaultDefenceObject,
};
