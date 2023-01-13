import {DEFAULT_STATS_OBJECT} from '../constants/defaults';
import {
  BASIC_CHARACTER,
  CRIT_CHARACTER,
  WITHOUT_PARAMS_CHARACTER,
} from '../constants/testing/character';
import Character from './Character';
import {TESTING_STATS} from '../constants/testing/stats';
import discriminators from '../constants/discriminators';
import {getDefaultAttackObject, getDefaultDefenceObject} from '../helper/object';
import StatusManagerClass from './StatusManager';
import SkillManagerClass from './SkillManager';
import LogManagerClass from './LogManager';
import {ATTACK_TYPE} from '../constants/types';
import M from '../constants/messages';
import {attBuff, breakDefence, poison} from '../constants/testing/status';

describe('Character tests', () => {
  let char: any;

  /**
     * resets the character.
     */
  beforeAll(() => {
    char = BASIC_CHARACTER;
  });

  describe('character is created correctly', () => {
    test('Char without params attack', () => {
      expect(WITHOUT_PARAMS_CHARACTER.stats).toEqual(DEFAULT_STATS_OBJECT);
    });

    test('Created Character with correct Stats', () => {
      char = new Character({
        stats: TESTING_STATS.correct_basic_stats,
      });

      expect(typeof char).toBe('object');
      expect(char.stats).toStrictEqual(TESTING_STATS.correct_basic_stats);

      // total_hp setted case.
      const charb = new Character({
        stats: {total_hp: 1000},
      });

      expect(charb.stats.total_hp).toBe(1000);
      expect(charb.stats.hp).toBe(1000);

      // custom id setted
      const charc = new Character({id: 'carlos'});

      expect(charc.id).toBe('carlos');

      // is alive setted case.
      const deadChar = new Character({isAlive: false});

      expect(deadChar.isAlive).toBe(false);

      let chard = new Character({stats: {total_hp: 3, hp: 2}});
      expect(chard.stats.hp).toBe(2);
      expect(chard.stats.total_hp).toBe(3);

      chard = new Character({stats: {total_hp: 2, hp: 3}});
      expect(chard.stats.hp).toBe(2);
      expect(chard.stats.total_hp).toBe(2);
    });
  });

  describe('character attacks', () => {
    const ATTACKS = {
      NORMAL: {
        discriminator: discriminators.ATTACK_OBJECT, type: ATTACK_TYPE.NORMAL,
        value: 10, status: {statusLastExecution: false, statsAffected: [], value: {}},
      },
      MISS: {
        discriminator: discriminators.ATTACK_OBJECT, type: ATTACK_TYPE.MISS,
        value: 0, status: {statusLastExecution: false, statsAffected: [], value: {}},
      },
      CRITICAL: {
        discriminator: discriminators.ATTACK_OBJECT, type: ATTACK_TYPE.CRITICAL,
        value: 2, status: {statusLastExecution: false, statsAffected: [], value: {}},
      },
    };

    test('Character attacks', () => {
      expect(BASIC_CHARACTER.attack()).toStrictEqual(ATTACKS.NORMAL);
    });

    test('Character attacks and it\'s miss', () => {
      const char = new Character({stats: {accuracy: 0}});
      expect(char.attack()).toStrictEqual(ATTACKS.MISS);
    });

    test('Character attacks and it\'s crit', () => {
      expect(CRIT_CHARACTER.attack()).toStrictEqual(ATTACKS.CRITICAL);
    });
  });

  describe('character defends', () => {
    describe('character deffence works correctly', () => {
      const finalDamage = BASIC_CHARACTER.defend(BASIC_CHARACTER.attack());

      expect(finalDamage).toEqual({
        discriminator: discriminators.DEFENCE_OBJECT,
        value: 5,
        type: 'NORMAL',
      });
    });

    describe('character evades attack', () => {
      char = BASIC_CHARACTER;
      char.setStat('evasion', 100);

      const solution = char.defend(char.attack());
      expect(solution.type).toEqual('EVASION');
      expect(solution.value).toEqual(0);
    });

    describe('character min value is set', () => {
      const wall = new Character({stats: {defence: 9999}});
      const solution = wall.defend(char.attack());
      expect(solution.value).toEqual(0);
    });

    describe('defence function can be override and works', () => {
      // as de default function checks the min value, now can be negative.
      // this function just returns a DefenceObject with value = -5
      char.setDefenceFunction(() => {
        const solution = getDefaultDefenceObject({value: -5});
        return solution;
      });

      // de attack object do not matter
      expect(char.defend(char.attack()).value).toEqual(-5);
    });
  });

  describe('character Status Manager', () => {
    test('Status Manager exist', () => {
      expect(char.StatusManager).toBeInstanceOf(StatusManagerClass);
    });

    test('add and remove status', () => {
      char.addStatus(poison);
      expect(char.StatusManager.statusList.length).toBe(1);
      char.addStatus([attBuff, breakDefence]);
      expect(char.StatusManager.statusList.length).toBe(3);

      char.removeStatus(char.StatusManager.statusList[0].id);
      expect(char.StatusManager.statusList.length).toBe(2);
      char.removeStatus(attBuff);
      expect(char.StatusManager.statusList.length).toBe(1);
    });
  });

  describe('character Skills Manager', () => {
    test('Status Manager exist', () => {
      expect(char.SkillManager).toBeInstanceOf(SkillManagerClass);
    });
  });

  describe('character Log Manager', () => {
    test('Status Manager exist', () => {
      expect(char.LogManager).toBeInstanceOf(LogManagerClass);
    });
  });

  describe('character receives extra params', () => {
    test('character can receive and access to unexpected params', () => {
      const char_with_unexpected_params = new Character({
        stats: {mana: 100},
        getMana: () => {
          return char_with_unexpected_params.stats.mana;
        },
      });
      expect(char_with_unexpected_params.stats.mana).toBe(100);
    });
  });

  describe('character callbacks', () => {
    const testDummy = new Character({
      attackCounter: 0,
      setStatCounter: 0,
      defendCounter: 0,
      statsSetted: 0,
      statusSetted: 0,
    });

    // attack
    testDummy.setCallback('attack', () => {
      testDummy.attackCounter++;

      return getDefaultAttackObject({value: 10});
    });
    testDummy.attack();
    expect(testDummy.attackCounter).toBe(1);

    // set Stat
    testDummy.setCallback('setStat', () => {
      testDummy.setStatCounter++;
    });
    testDummy.setStat('hp', 10);
    expect(testDummy.setStatCounter).toBe(1);

    // after turn
    testDummy.setCallback('afterTurn', () => {
      testDummy.setStat('mana', 100);
    });
    testDummy.afterTurn();
    expect(testDummy.stats.mana).toBe(100);

    // before turn
    testDummy.setCallback('beforeTurn', () => {
      testDummy.setStat('attack', testDummy.stats.attack * 2);
    });
    testDummy.beforeTurn();
    expect(testDummy.stats.attack).toBe(2);

    // defend
    testDummy.setCallback('defend', () => {
      testDummy.defendCounter++;

      return getDefaultDefenceObject();
    });
    testDummy.defend(testDummy.attack());
    expect(testDummy.defendCounter).toBe(1);

    // set stat
    testDummy.setCallback('setStat', () => {
      testDummy.statsSetted++;
    });
    testDummy.setMultipleStats({'hp': 1000});
    testDummy.setStats({...testDummy.stats});
    expect(testDummy.statsSetted).toBe(3);

    // add status
    testDummy.setCallback('addStatus', () => {
      testDummy.statusSetted++;
    });
    testDummy.addStatus(poison);
    expect(testDummy.statusSetted).toBe(1);
  });

  describe('character after turns', () => {
    char = new Character();
    char.afterTurn();
    expect(char.LogManager.logs.length).toBe(1);
  });

  describe('character before turns', () => {
    char = new Character();
    char.beforeTurn();
    expect(char.LogManager.logs.length).toBe(1);
  });

  describe('character gets/sets attributes', () => {
    test('character getAttribute', () => {
      // correct attribute
      expect(char.getAttribute('stats')).toEqual(char.stats);

      // incorrect attribute
      expect(char.getAttribute('whatever_not_existing')).toBeUndefined();

      expect(char.getAttribute('')).toBeUndefined();
      expect(char.getAttribute()).toBeUndefined();
    });

    test('character setAttribute', () => {
      // correct attribute
      char.setAttribute('minDamageDealt', 100);
      expect(char.minDamageDealt).toEqual(100);

      // nested attribute. unsuported
      expect(() => char.setAttribute('stats.attack')).toThrowError(new Error(M.errors.nested_unsupported));

      char.setAttribute('defenceFunction', () => { });
      expect(char.defenceFunction).not.toBeFalsy();
    });
  });

  describe('getDefenceFunction works', () => {
    expect(char.getDefenceFunction()).toEqual(char.defenceFunction);
  });

  describe('getsStats/setsStats  works', () => {
    test('character getStat', () => {
      // correct attribute
      expect(char.getStat('stats.crit')).toBe(0);

      // incorrect attribute
      expect(char.getStat('whatever_not_existing')).toBeUndefined();

      expect(char.getStat('')).toBeUndefined();
      expect(char.getStat()).toBeUndefined();
    });

    test('character setStat', () => {
      char.setStat('hp', -1);
      expect(char.stats.hp).toBe(-1);
      expect(char.isAlive).toBe(false);

      char.revive();

      char.setStat('total_hp', -1);
      expect(char.stats.hp).toBe(-1);
    });

    test('character setMultipleStats', () => {
      expect(char.stats.attack).toBe(1);
      expect(char.stats.evasion).toBe(0);
      expect(char.stats.defence).toBe(0);
      expect(char.stats.mana).toBeUndefined();

      char.setMultipleStats({
        attack: 20,
        evasion: 20,
        defence: 20,
        mana: 20,
      });
      expect(char.stats.attack).toBe(20);
      expect(char.stats.evasion).toBe(20);
      expect(char.stats.defence).toBe(20);
      expect(char.stats.mana).toBe(20);

      char.setStats({
        attack: 20,
        evasion: 20,
        defence: 20,
        mana: 20,
      });
      expect(char.stats.hp).toBeUndefined();
      expect(char.stats.crit).toBeUndefined();
      expect(char.stats.attack).toBe(20);
      expect(char.stats.evasion).toBe(20);
      expect(char.stats.defence).toBe(20);
      expect(char.stats.mana).toBe(20);
    });
  });

  describe('character can be killed and revived', () => {
    char.setStat('hp', 1000);
    expect(char.stats.total_hp).toBe(1000);

    char.kill();
    expect(char.isAlive).toBe(false);
    expect(char.stats.hp).toBe(0);

    char.revive();
    expect(char.isAlive).toBe(true);
    expect(char.stats.hp).toBe(1000);
  });

  describe('to get code coverage...', () => {
    test('rand', () => {
      expect(char.rand(1)).not.toBeNaN();
    });
  });

  describe('char test', () => {
    const test = new Character({

    });
  });
});
