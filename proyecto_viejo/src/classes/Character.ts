/* eslint-disable max-len */
import { ATTACK_TYPE, DEFENCE_TYPE, M } from '../constants';
import { getDefaultAttackObject, getDefaultDefenceObject, getNestedPropByString, getProb, getStatsObject, isPrimitiveType, uniqueID } from '../helper';
import { AttackObject, CallBacks, CharacterConstructor, Stats, StatsKeys, TCharacter } from '../interfaces';
import {LogManager, SkillManager, Status, StatusManager} from '.';


class CharacterClass {
  callbacks: CallBacks = {};

  id: number = uniqueID();

  isAlive: boolean = true;

  LogManager: LogManager;

  name: string = 'Character';

  originalStats: Partial<Stats> = {};

  SkillManager: SkillManager;

  StatusManager: StatusManager;

  stats: Partial<Stats> = getStatsObject();

  statsAffected: Partial<Stats> = {};

  constructor(con?: CharacterConstructor) {
    con && Object.assign(this, con);

    this.originalStats = con?.stats || {};

    let total_hp = 0;
    let hp = 0;
    if (con?.stats?.total_hp && con?.stats?.hp) {
      total_hp = con?.stats?.total_hp; // si la vida es >, vida total = la vida
      hp = con?.stats?.hp > con?.stats?.total_hp ? con?.stats?.total_hp : con?.stats?.hp; // si la vida es >, la vida = vida total
    } else if (con?.stats?.total_hp && !con?.stats?.hp) {
      total_hp = con?.stats?.total_hp;
      hp = con?.stats?.total_hp;
    } else if (!con?.stats?.total_hp && con?.stats?.hp) {
      hp = con?.stats?.hp;
      total_hp = con?.stats?.hp;
    } else if (!con?.stats?.total_hp && !con?.stats?.hp) {
      //
    }

    this.stats.hp = hp;
    this.stats.total_hp = total_hp;


    this.StatusManager = new StatusManager();
    this.SkillManager = new SkillManager();
    this.LogManager = new LogManager();
  }

  addStatus = (status: Status | Status[] ) => {
    this.StatusManager.activate('BEFORE_ADD_STATUS', this);

    this.StatusManager.addStatus(status);

    if ((status as Status).discriminator) {
      this.LogManager && this.LogManager.addLogStatus((status as Status), 'added', this);
    } else {
      (status as Status[]).forEach((stat) => {
        this.LogManager && this.LogManager.addLogStatus(stat, 'added', this);
      });
    }

    this.StatusManager.activate('AFTER_ADD_STATUS', this);
    this.callbacks['addStatus'] && this.callbacks['addStatus']();
  };

  afterTurn = () => {
    this.StatusManager.activate('AFTER_TURN', this);
    this.LogManager && this.LogManager.addLog('after turn', this);
    this.callbacks['afterTurn'] && this.callbacks['afterTurn']();
  };

  attack() {
    // if activate('BEFORE_ATTACK') returns an AttackObject, solution will be initializes with it
    let solution = getDefaultAttackObject(
            this.StatusManager.activate('BEFORE_ATTACK', this) as any,
    );
    const {accuracy = 100, crit = 0, crit_multiplier = 1, attack = 1} = this.stats;

    if (accuracy < getProb()) {
      solution.type = ATTACK_TYPE.MISS;
    } else if (crit >= getProb()) {
      solution.value = attack * crit_multiplier;
      solution.type = ATTACK_TYPE.CRITICAL;
    } else {
      // normal hit
      solution.value = attack;
    }

    this.StatusManager.activate('AFTER_ATTACK', this);

    const callbackSolution = this.callbacks['attack'] && this.callbacks['attack']();
    solution = callbackSolution ? callbackSolution : solution;

    this.LogManager && this.LogManager.addLogFromAttackObject(solution, this);

    return solution;
  };

  beforeTurn = () => {
    this.StatusManager.activate('BEFORE_TURN', this);
    this.LogManager && this.LogManager.addLog('before turn', this);
    this.callbacks['beforeTurn'] && this.callbacks['beforeTurn']();
  };

  defend(attackObject: AttackObject) {
    this.StatusManager.activate('BEFORE_DEFENCE', this);

    let solution = this.defenceFunction(attackObject);

    this.StatusManager.activate('AFTER_DEFENCE', this);

    const callbackSolution = this.callbacks['defend'] && this.callbacks['defend']();
    solution = callbackSolution ? callbackSolution : solution;

    this.LogManager && this.LogManager.addLogFromDefenceObject(solution, this);

    return solution;
  }

  defenceFunction = (attackObject: AttackObject) => {
    const defenceObject = getDefaultDefenceObject();

    if (this.stats.evasion! >= getProb()) {
      defenceObject.type = DEFENCE_TYPE.EVASION;
      defenceObject.value = 0;
    } else {
      defenceObject.value = attackObject.value - this.stats.defence!;
      if (typeof this.stats.min_damage_dealt === 'number' &&
      defenceObject.value <= Number(this.stats.min_damage_dealt)) {
        defenceObject.value = this.stats.min_damage_dealt;
      }
    }

    return defenceObject;
  };

  getAttribute(characterKey: string) {
    if (!characterKey) return undefined;
    return getNestedPropByString(this, characterKey as string);
  };

  getStat(statKey: string) {
    if (!statKey) return undefined;
    return getNestedPropByString(this.stats, statKey);
  };

  kill() {
    this.isAlive = false;
    this.stats.hp = 0;
  }

  removeStatus(status: Status | number) {
    this.StatusManager.activate('BEFORE_REMOVE_STATUS', this);

    const removedStatus = typeof status === 'number' ?
            this.StatusManager.removeStatusById(status) :
            this.StatusManager.removeStatus(status);

    this.LogManager.addLogStatus(removedStatus!, 'removed', this);
    this.StatusManager.activate('AFTER_REMOVE_STATUS', this);
  };

  revive() {
    this.isAlive = true;
    this.stats.hp = this.stats.total_hp;
  }

  setAttribute(key: keyof CharacterClass, value: any) {
    if ((key as string).includes('.')) throw Error(M.errors.nested_unsupported);

    this[key as keyof this] = value;

    this.LogManager.addLog(`attribute ${key} setted`, this);
  }

  setFunction(key: keyof CharacterClass, value: any) {
    if (typeof value !== 'function') throw Error(M.errors.function_expected);

    this[key as keyof this] = ((args: Parameters<typeof value>) => {
      const solution = value(args);
      this.LogManager.addLog(`function ${key} called`, this);

      this.callbacks[key] && this.callbacks[key]!();
      return solution;
    }) as any;
  }

  setCallback = <T>(key: keyof CallBacks, cb: ((...args: any[]) => any)) => {
    this.callbacks[key] = cb;
  };

  setStat(key: StatsKeys, value: number) {
    if ((key === 'hp' || key === 'total_hp') && value <= 0) this.kill();
    if (key === 'total_hp' && value < this.stats['hp']!) this.stats['hp'] = value;
    if (key === 'hp' && value > this.stats['total_hp']!) this.stats['total_hp'] = value;

    this.stats[key] = value;

    // LOG
    this.LogManager.addLog(`stat setted: key:${key}, value:${value}`, this);

    this.callbacks['setStat'] && this.callbacks['setStat']();
  };

  setMultipleStats(statsObject: Partial<Stats>) {
    Object.keys(statsObject).forEach((key) => {
      this.setStat(key as StatsKeys, statsObject[key as StatsKeys]! );
      this.LogManager.addLog(`stat setted: ${statsObject[key as StatsKeys]}`, this);
    });

    this.callbacks['setStat'] && this.callbacks['setStat']();
  }

  setStats(statsObject: Partial<Stats>) {
    this.stats = {...this.stats, ...statsObject};

    this.LogManager.addLog(`stats overrided`, this);

    this.callbacks['setStat'] && this.callbacks['setStat']();
  }
}

const OpenCharacter = CharacterClass as TCharacter;

export {
  CharacterClass as Character, // fixed character
  OpenCharacter, // Open character with flexible interface
};

export default CharacterClass;
