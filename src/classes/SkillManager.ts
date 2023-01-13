import discriminators from '../constants/discriminators';
import {uniqueID} from '../helper';
import Skill from './Skill';
import {Constructor, SkillManagerConstructor, ISkills} from '../interfaces/SkillManager.Interface';
import {CharacterClass} from './Character';


class SkillManager {
  character: CharacterClass;

  skills: ISkills = {};

  constructor(arg: Constructor) {
    // added the rest of parameters to the Character. ANY allowed.
    Object.keys(arg).forEach((key) => {
      this[key] = arg[key];
    });
  }

  /**
    * @param skill single skill or a list of skills to add into the skills object.
    */
  add(skill: Skill | Skill[]): void {
    if ((skill as Skill).discriminator === discriminators.SKILLS) {
      this.skills[(skill as Skill).name] = skill as Skill;
    } else {
      (skill as Skill[]).forEach((skill) => {
        this.skills[skill.name] = skill;
      });
    }
  }

  /**
    * @param skill to remove from the skills object.
    * @return the deleted skill.
    */
  remove(skill: Skill): Skill {
    const returnedSkill = this.skills[skill.name];
    delete this.skills[skill.name];
    return returnedSkill;
  }

  /**
    * @param name to remove from the skills object
    * @return the deleted skill.
    */
  removeByName(name: string): Skill {
    const returnedSkill = this.skills[name];
    delete this.skills[name];
    return returnedSkill;
  }
}

export default SkillManager;
