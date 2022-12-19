import { CharacterClass } from "../classes/Character";
import Skill from "../classes/Skill";
import SkillManager from "../classes/SkillManager";


type MySkillManager<T extends object> = T & {
    [x in keyof SkillManager]: SkillManager[x]
}

type SkillManagerConstructor = {
    new <T extends object>(arg: T): MySkillManager<T>
}

type Constructor = Partial<{
    character: CharacterClass;
    skills: ISkills;
}> & Record<string, any>

interface ISkills {
    [x:string]: Skill
}

export {
    SkillManagerConstructor,
    Constructor,
    ISkills
 };
