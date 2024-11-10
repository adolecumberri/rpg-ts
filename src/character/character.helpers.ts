import { createDefaultObjectGetter } from '../common/common.helpers';
import { DEFAULT_ATTACK_OBJECT } from './character.constants';
import { AttackResult } from './character.types';

const getDefaultAttackObject = createDefaultObjectGetter<AttackResult>(DEFAULT_ATTACK_OBJECT);

export {
    getDefaultAttackObject,
};
