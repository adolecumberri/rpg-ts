import Character from '../../classes/Character';
import {getStatsObject} from '../../helper/object';

const BASIC_CHARACTER = new Character({
  stats: getStatsObject({hp: 100, attack: 10, defence: 5}),
  mana: 0,
  name: 'dummy_boy',
});
const CRIT_CHARACTER = new Character({stats: getStatsObject({crit: 100, crit_multiplier: 2})});
const WITHOUT_PARAMS_CHARACTER = new Character();


export {
  BASIC_CHARACTER,
  CRIT_CHARACTER,
  WITHOUT_PARAMS_CHARACTER,
};
