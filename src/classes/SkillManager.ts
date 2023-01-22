import discriminators from '../constants/discriminators';
import {uniqueID} from '../helper';
import Skill from './Skill';
import {Constructor, SkillManagerConstructor, ISkills} from '../interfaces/SkillManager.Interface';

class SkillManager {
  skills: ISkills = {};

  constructor(constructor?: Constructor) {
    constructor && Object.assign(this, constructor);

    // Object.keys(constructor).forEach((key) => {
    //   this[key] = constructor[key];
    // });
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
