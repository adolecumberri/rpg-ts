import {CharacterClass} from '../classes/Character';
import Skill from '../classes/Skill';
import discriminators from '../constants/discriminators';
import {Stats} from './Stats.Interface';

type IMySkill<T extends object> = T & {
    [x in keyof Skill]: Skill[x]
}

type SkillConstructor = {
    new <T extends object>(arg: T): IMySkill<T>
}

type Constructor = Partial<{
    activate: {
        (param?: any): any
    };
    character: CharacterClass;
    discriminator: typeof discriminators.SKILLS;
    name: string;
    stats: Partial<Stats>;
    timesUsed: number;
}> & Record<string, any>

export {
  SkillConstructor,
  Constructor,
};
