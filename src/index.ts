/* eslint-disable linebreak-style */
import {
  Character,
  LogManager,
  Skill,
  SkillManager,
  Status,
  StatusManager,
} from './classes/index';

import {
  DEFAULT_STATS_OBJECT,
  DEFAULT_DEFENCE_OBJECT,
  DEFAULT_ATTACK_OBJECT,
  discriminators,
  M,
  STATUS_APPLIED_ON,
  DEFAULT,
  STATUS_TYPE,
  STATUS_DURATIONS,
  STATUS_SOURCE,
  STATUS_WHEN_TO_APPLY,
  ATTACK_TYPE,
  DEFENCE_TYPE,
} from './constants/index';

import {
  uniqueID,
  getDefaultDefenceObject,
  getDefaultAttackObject,
  getStatsObject,
} from './helper/index';

export {
  Character,
  LogManager,
  Skill,
  SkillManager,
  Status,
  StatusManager,
  DEFAULT_STATS_OBJECT,
  DEFAULT_DEFENCE_OBJECT,
  DEFAULT_ATTACK_OBJECT,
  discriminators,
  M,
  STATUS_APPLIED_ON,
  DEFAULT,
  STATUS_TYPE,
  STATUS_DURATIONS,
  STATUS_SOURCE,
  STATUS_WHEN_TO_APPLY,
  ATTACK_TYPE,
  DEFENCE_TYPE,
  uniqueID,
  getDefaultDefenceObject,
  getDefaultAttackObject,
  getStatsObject,
};
