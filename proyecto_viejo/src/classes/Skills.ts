import { discriminators } from '../constants';
import { getStatsObject } from '../helper';
import { SkillConstructor, Stats, TSkill } from '../interfaces';

class SkillClass {
  activate: unknown;

  deactivate: unknown;

  description: string = '';

  discriminator = discriminators.SKILLS;

  name: string = '';

  stats: Partial<Stats> = getStatsObject();

  timesActivated = 0;

  timesDeactivated = 0;

  constructor(con?: SkillConstructor) {
    this.stats = getStatsObject(con?.stats); // should I remove it?
    con && Object.assign(this, con);

    if (con?.activate) {
      this.activate = (() => {
        this.timesActivated += 1;
        return con?.activate;
      })();
    }

    if ( con?.deactivate ) {
      this.deactivate = (() => {
        this.timesDeactivated += 1;
        return con?.deactivate;
      })();
    }
  }

  setActivate = (activate: unknown) => {
    this.activate = (() => {
      this.timesActivated += 1;
      return activate;
    })();
  };

  setDeactivate = (deactivate: unknown) => {
    this.deactivate = (() => {
      this.timesDeactivated += 1;
      return deactivate;
    })();
  };
}

const OpenSkill = SkillClass as TSkill;

export {
  SkillClass as Skill,
  OpenSkill,
};

export default SkillClass;
