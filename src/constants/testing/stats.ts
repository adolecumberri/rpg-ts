import discriminators from '../discriminators';
import {getStatsObject} from '../../helper/object';
import {Stats} from '../../interfaces';

const TESTING_STATS = {
  correct_basic_stats: getStatsObject({
    accuracy: 1,
    attack: 1,
    attack_interval: 1,
    attack_speed: 1,
    crit: 0,
    crit_multiplier: 1,
    total_hp: 0,
    defence: 0,
    evasion: 0,
    hp: 0,
  }),
  correct_high_stats: getStatsObject({
    accuracy: 99,
    attack: 999999,
    attack_interval: 999999,
    attack_speed: 999999,
    crit: 1,
    crit_multiplier: 999999,
    total_hp: 999999,
    defence: 999999,
    evasion: 1,
    hp: 999999,
  }),
  wrong_low_stats: getStatsObject({
    accuracy: -1,
    attack: -1,
    attack_interval: -1,
    crit: -1,
    crit_multiplier: 0,
    total_hp: -1,
    defence: null,
    evasion: -1,
    hp: -1,
  }),
  wrong_high_stats: getStatsObject({
    accuracy: 101,
    crit: 101,
    evasion: 101,
  }),
};

const CHARACTER_STATS = {
  correct_basic_stats: getStatsObject({
    accuracy: 100,
    attack: 1,
    attack_interval: 1,
    att_speed: 1,
    crit: 0,
    crit_multiplier: 1,
    total_hp: 0,
    defence: 0,
    evasion: 0,
    hp: 0,
    discriminator: discriminators.STATS,
  }),
  incorrect_high_stats: getStatsObject({
    accuracy: 101,
    attack: -1,
    attack_interval: -1,
    att_speed: -1,
    crit: -1,
    crit_multiplier: 0, // 1
    total_hp: -1,
    evasion: -1,
    hp: -1,
    discriminator: discriminators.STATS,
  }),
  base_stats: getStatsObject({
    accuracy: 100,
    attack: 1,
    evasion: 0,
    crit: 0,
    crit_multiplier: 1,
    total_hp: 0,
    defence: 0,
    hp: 0,
    discriminator: discriminators.STATS,
  }),
};

export {TESTING_STATS, CHARACTER_STATS};
