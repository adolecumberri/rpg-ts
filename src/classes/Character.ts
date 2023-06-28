
import { ATTACK_TYPE_CONST, DEFAULT_STATS_OBJECT, DEFENCE_TYPE_CONST, STATUS_APPLICATION_MOMENTS } from '../constants';
import {
  getDefaultAttackObject,
  getDefaultDefenceObject,
  getDefaultStatsObject,
  getRandomInt,
  uniqueID,
} from '../helpers';
import {
  AttackResult,
  AttackType,
  CharacterConstructor,
  DefenceResult,
  DynamicCharacterConstructor,
  Stats,
} from '../types';
import { Status, StatusManager } from './';


class BaseCharacter {
  id: number = uniqueID();
  isAlive: boolean = true;
  name: string = '';
  originalStats: Partial<Stats> = {};
  stats: Stats;
  statusManager: StatusManager | null = null;

  damageCalculation = {
    [ATTACK_TYPE_CONST.CRITICAL]: (stats: Stats) => stats.attack * stats.critMultiplier,
    [ATTACK_TYPE_CONST.NORMAL]: (stats: Stats) => stats.attack,
    [ATTACK_TYPE_CONST.MISS]: (_: Stats) => 0,
  };

  constructor(con?: CharacterConstructor) {
    con && Object.assign(this, con);

    let totalHpProvided = con?.stats?.totalHp ?? DEFAULT_STATS_OBJECT.totalHp;
    const hpProvided = con?.stats?.hp ?? DEFAULT_STATS_OBJECT.hp;

    totalHpProvided = Math.max(totalHpProvided, hpProvided);

    this.stats = Object.assign(
        getDefaultStatsObject(),
        con?.stats,
        {
          totalHp: totalHpProvided,
          hp: hpProvided,
        },
    );

    this.originalStats = this.stats;
    this.statusManager = con?.statusManager ? new StatusManager({ character: this }) : null;
  }

  addStatus(status: Status[] | Status) {
    this.statusManager?.addStatus(status);
  }

  attack(callbacks?: {
    missAttackCallback?: (c: BaseCharacter) => void,
    criticalAttackCallback?: (c: BaseCharacter) => void,
    normalAttackCallback?: (c: BaseCharacter) => void,
    afterAnyAttackCallback?: (c: BaseCharacter) => void
  }): AttackResult {
    const accuracyRoll = getRandomInt(100); // Genera un número entre 0 y 100.
    const critRoll = getRandomInt(100); // Genera un número entre 0 y 100.

    let attackType: AttackType;

    if (accuracyRoll > this.stats.accuracy) {
      // Si el roll es mayor que la precisión del personaje, el ataque falla.
      attackType = ATTACK_TYPE_CONST.MISS;
      callbacks?.missAttackCallback?.(this);
    } else if (critRoll < this.stats.crit) {
      // Si el roll es menor que la estadística de crítico del personaje, es un golpe crítico.
      attackType = ATTACK_TYPE_CONST.CRITICAL;
      callbacks?.criticalAttackCallback?.(this);
    } else {
      // Si ninguna de las condiciones anteriores se cumple, es un golpe normal.
      attackType = ATTACK_TYPE_CONST.NORMAL;
      callbacks?.normalAttackCallback?.(this);
    }

    const damage = this.calculateDamage(attackType, this.stats);

    const solution = getDefaultAttackObject();
    solution.type = attackType;
    solution.value = damage;
    callbacks?.afterAnyAttackCallback?.(this);
    return solution;
  }

  afterBattle(callback?: (c: BaseCharacter) => void): any {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_BATTLE);
    this.statusManager?.removeAllStatuses();
    callback?.(this);
    // Aquí pueden realizarse otras acciones necesarias después de la batalla.
  }

  beforeBattle(callback?: (c: BaseCharacter) => void): any {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_BATTLE);
    callback?.(this);
    // Aquí pueden realizarse otras acciones necesarias antes de la batalla.
  }

  calculateDamage(type: AttackType, stats: Stats): number {
    if (!(type in this.damageCalculation)) {
      throw new Error(`Invalid attack type: ${type}`);
    }

    return this.damageCalculation[type](stats);
  }

  defend(
      attack: AttackResult,
      callbacks?: {
      missDefenceCallback?: (c: BaseCharacter) => void,
      trueDefenceCallback?: (c: BaseCharacter) => void,
      evasionDefenceCallback?: (c: BaseCharacter) => void,
      normalDefenceCallback?: (c: BaseCharacter) => void,
      afterAnyDefenceCallback?: (c: BaseCharacter) => void
    },
  ): DefenceResult {
    const defence: DefenceResult = getDefaultDefenceObject();

    // Si el ataque falla, no se hace daño.
    if (attack.type === ATTACK_TYPE_CONST.MISS) {
      defence.type = DEFENCE_TYPE_CONST.MISS;
      defence.value = 0;
      callbacks?.missDefenceCallback?.(this);
    } else if (attack.type === ATTACK_TYPE_CONST.TRUE) { // Si el ataque es verdadero, pasa sin modificarse.
      defence.type = DEFENCE_TYPE_CONST.NORMAL; // asumiremos que el tipo es 'NORMAL' para un ataque verdadero.
      defence.value = attack.value;
      callbacks?.trueDefenceCallback?.(this);
    } else { // Para ataques normales y críticos, se calcula el daño teniendo en cuenta la defensa y la evasión.
      const evasionRoll = getRandomInt(100); // Genera un número entre 0 y 100.
      if (evasionRoll < this.stats.evasion) {
        // Si el roll es menor que la estadística de evasión del personaje, el ataque es evitado.
        defence.type = DEFENCE_TYPE_CONST.EVASION;
        defence.value = 0;
        callbacks?.evasionDefenceCallback?.(this);
      } else {
        // Si el ataque no es evitado, se calcula el daño.

        defence.type = DEFENCE_TYPE_CONST.NORMAL; // asumiremos que el tipo es 'NORMAL' para un ataque que no es evitado.
        defence.value = this.defenceCalculation(attack.value);
        callbacks?.normalDefenceCallback?.(this);
      }
    }

    callbacks?.afterAnyDefenceCallback?.(this);
    return defence;
  }

  defenceCalculation = (attack: number) => attack * 40 / (40 + this.stats.defence);

  die(callback?: (c: BaseCharacter) => void) {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_DIE);
    this.isAlive = false;
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_DIE);
    callback?.(this);
  }

  receiveDamage(damage: number, callback?: (c: BaseCharacter) => void) {
    this.updateHp(damage * -1);
    callback?.(this);
  }

  removeStatus(id: number, callback?: (c: BaseCharacter) => void) {
    this.statusManager?.removeStatusById(id);
    callback?.(this);
  }

  revive(callback?: (c: BaseCharacter) => void) {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_REVIVE);
    this.isAlive = true;
    // Aquí puedes implementar la lógica para restaurar las stats del personaje a sus valores originales (o a cualquier otro valor que consideres apropiado) cuando reviva
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_REVIVE);
    callback?.(this);
  }

  updateHp(amount: number, callback?: (c: BaseCharacter) => void): void {
    this.stats.hp = Math.min(this.stats.totalHp, Math.max(0, this.stats.hp + amount));

    if (this.stats.hp <= 0) {
      this.die();
    }

    callback?.(this);
  }
}

// con esto evito tener que usar typeof Status cada vez que lo uso fuera.
const Character = BaseCharacter as DynamicCharacterConstructor;
type Character = InstanceType<typeof BaseCharacter>

export default Character;

export {
  Character,
  BaseCharacter,
};
