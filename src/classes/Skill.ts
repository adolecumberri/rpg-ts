import discriminators from '../constants/discriminators';
import {Stats} from '../interfaces';
import {Constructor, SkillConstructor} from '../interfaces/Skills.Interface';

class Skill {
  activate: {
        (param?: any): any
    };

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
}

export default Skill;
