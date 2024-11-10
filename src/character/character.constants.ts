
import { ATTACK_TYPE } from '../common/common.constants';
import { AttackResult } from './character.types';

const DEFAULT_ATTACK_OBJECT: AttackResult = {
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

export {
    DEFAULT_ATTACK_OBJECT,
};
