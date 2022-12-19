import Character from "../../classes/Character";
import { getStatsObject } from "../../helper/object";

const basic_character = new Character({ stats: getStatsObject({hp: 100, attack: 10, defence: 5}), mana: 0, name: 'dummy_boy' })
const crit_character = new Character({ stats: getStatsObject({crit: 100, crit_multiplier: 2})});
const without_params_character = new Character();


export {
    basic_character,
    crit_character,
    without_params_character
}