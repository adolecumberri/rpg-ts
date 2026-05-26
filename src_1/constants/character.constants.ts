
import { ATTACK_TYPE } from './combat.constants';
import {
    AttackResult,
    DefenceResult,
} from '../types/combat.types';


const DEFAULT_ATTACK_OBJECT: AttackResult = {
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

const DEFAULT_DEFENCE_OBJECT: DefenceResult = {
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

export {
    DEFAULT_ATTACK_OBJECT,
    DEFAULT_DEFENCE_OBJECT,
};
