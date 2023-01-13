import discriminators from '../constants/discriminators';
import {Stats} from '../interfaces';
import {Constructor, SkillConstructor} from '../interfaces/Skills.Interface';
import {CharacterClass} from './Character';

class Skill {
  activate: {
        (param?: any): any
    };

  character: CharacterClass;

  discriminator = discriminators.SKILLS;

  name: string;

  stats: Partial<Stats>;

  timesUsed = 0;

  constructor(arg?: Constructor) {
    const {activate, ...rest} = arg;
    Object.keys(rest).forEach((key) => {
      this[key] = rest[key];
    });

    if (activate) {
      this.activate = (() => {
        this.timesUsed += 1;
        return activate;
      })();
    }
  }

  setCharacter(c: CharacterClass) {
    this.character = c;
  }
}

export default Skill;
