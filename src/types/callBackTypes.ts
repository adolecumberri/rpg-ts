import { AttackResult, DefenceObject } from '.';
import { Character } from '../classes';

type CallbackParams = {
    c: Character,
    attack?: AttackResult,
    defence?: DefenceObject,
    target?: Character,
};

export {
    CallbackParams,
};
