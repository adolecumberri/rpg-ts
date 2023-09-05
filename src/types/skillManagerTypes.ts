import { Character } from '../classes';
import { AttackResult, CharacterCallbacks, DefenceObject } from './characterTypes';

type useSkillParams = {
    c: Character,
    attack?: AttackResult,
    defence?: DefenceObject,
    target?: Character,
};

type Skill = {
    id: number;
    use: (params: useSkillParams, skill: Skill) => any;
    whenToUse: (keyof CharacterCallbacks)[]
    probability: number;
    isUsed: boolean;
    name: string;
};

export {
    Skill,
    useSkillParams,
};
