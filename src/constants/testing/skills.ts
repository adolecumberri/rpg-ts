import {defaultCharacter} from '../../classes/Character';
import Skill from '../../classes/Skill';
import Status from '../../classes/Status';
import {IStatAffected} from '../../interfaces/Status.interface';
import {STATUS_DURATIONS} from '../status';
import {frozen} from './status';

const fireBall = new Skill({
  name: 'fireball',
  stats: {
    damage: 20,
  },
  activate: function(character: defaultCharacter) {
    return character.stats.attack + (this as Skill).stats.damage;
  },
});

const iceBall = new Skill({
  name: 'Ice Ball',
  stats: {
    attack: 10,
    statusPrecision: 100,
  },
  activate: function(victim: defaultCharacter) {
    const damage = (this as Skill).stats.attack;

    if ((this as Skill).stats.statusPrecision) {
      victim.StatusManager.addStatus(frozen, victim);
    }

    victim.setStat('hp', victim.stats.hp - damage);
  },
});

const blessing = new Skill({
  name: 'blessing',
  activate: function(user: defaultCharacter) {
    const attackUp: IStatAffected = {from: 'attack', to: 'attack', value: 10, type: 'BUFF_FIXED'};
    const deffenceUp: IStatAffected = {from: 'defence', to: 'defence', value: 10, type: 'BUFF_FIXED'};

    const statusBlessing = new Status({
      statsAffected: [attackUp, deffenceUp],
      whenToApply: 'ONCE',
      durationValue: 8,
      durationType: STATUS_DURATIONS.TEMPORAL,
    });

    user.StatusManager.addStatus(statusBlessing, user);
  },
});

export default {
  iceBall,
  fireBall,
  blessing,
};
