
import { ATTACK_TYPE_CONST, DEFAULT_STATS_OBJECT, DEFENCE_TYPE_CONST, STATUS_APPLICATION_MOMENTS } from '../constants';
import {
  getDefaultAttackObject,
  getDefaultDefenceObject,
  getDefaultStatsObject,
  getRandomInt,
  uniqueID,
} from '../helpers';
import { AttackResult, AttackType, Constructor, DefenceResult, Stats } from '../types';
import { Status, StatusManager } from './';


class Character {
  id: number = uniqueID();
  isAlive: boolean = true;
  name: string = '';
  originalStats: Partial<Stats> = {};
  stats: Stats;
  statusManager: StatusManager | null;

  private damageCalculation = {
    [ATTACK_TYPE_CONST.CRITICAL]: (stats: Stats) => stats.attack * stats.critMultiplier,
    [ATTACK_TYPE_CONST.NORMAL]: (stats: Stats) => stats.attack,
    [ATTACK_TYPE_CONST.MISS]: (_: Stats) => 0,
  };

  constructor(con?: Constructor) {
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
    this.statusManager.addStatus(status);
  }

  attack() {
    const accuracyRoll = getRandomInt(100); // Genera un número entre 0 y 100.
    const critRoll = getRandomInt(100); // Genera un número entre 0 y 100.

    let attackType: AttackType;

    if (accuracyRoll > this.stats.accuracy) {
      // Si el roll es mayor que la precisión del personaje, el ataque falla.
      attackType = ATTACK_TYPE_CONST.MISS;
    } else if (critRoll < this.stats.crit) {
      // Si el roll es menor que la estadística de crítico del personaje, es un golpe crítico.
      attackType = ATTACK_TYPE_CONST.CRITICAL;
    } else {
      // Si ninguna de las condiciones anteriores se cumple, es un golpe normal.
      attackType = ATTACK_TYPE_CONST.NORMAL;
    }

    const damage = this.calculateDamage(attackType, this.stats);

    const solution = getDefaultAttackObject();
    solution.type = attackType;
    solution.value = damage;

    return solution;
  }

  calculateDamage(type: AttackType, stats: Stats): number {
    if (!(type in this.damageCalculation)) {
      throw new Error(`Invalid attack type: ${type}`);
    }

    return this.damageCalculation[type](stats);
  }

  defend(attack: AttackResult): DefenceResult {
    const defence: DefenceResult = getDefaultDefenceObject();

    // Si el ataque falla, no se hace daño.
    if (attack.type === ATTACK_TYPE_CONST.MISS) {
      defence.type = DEFENCE_TYPE_CONST.MISS;
      defence.value = 0;
    } else if (attack.type === ATTACK_TYPE_CONST.TRUE) { // Si el ataque es verdadero, pasa sin modificarse.
      defence.type = DEFENCE_TYPE_CONST.NORMAL; // asumiremos que el tipo es 'NORMAL' para un ataque verdadero.
      defence.value = attack.value;
    } else { // Para ataques normales y críticos, se calcula el daño teniendo en cuenta la defensa y la evasión.
      const evasionRoll = getRandomInt(100); // Genera un número entre 0 y 100.
      if (evasionRoll < this.stats.evasion) {
        // Si el roll es menor que la estadística de evasión del personaje, el ataque es evitado.
        defence.type = DEFENCE_TYPE_CONST.EVASION;
        defence.value = 0;
      } else {
        // Si el ataque no es evitado, se calcula el daño.

        defence.type = DEFENCE_TYPE_CONST.NORMAL; // asumiremos que el tipo es 'NORMAL' para un ataque que no es evitado.
        defence.value = this.defenceCalculation(attack.value);
      }
    }

    return defence;
  }

  defenceCalculation = (attack: number) => attack * 40 / (40 + this.stats.defence);

  die() {
    this.statusManager.activate(STATUS_APPLICATION_MOMENTS.BEFORE_DIE);
    this.isAlive = false;
    this.statusManager.activate(STATUS_APPLICATION_MOMENTS.AFTER_DIE);
  }

  removeStatus(id: number) {
    this.statusManager.removeStatusById(id);
  }

  revive() {
    this.statusManager.activate(STATUS_APPLICATION_MOMENTS.BEFORE_REVIVE);
    this.isAlive = true;
    // Aquí puedes implementar la lógica para restaurar las stats del personaje a sus valores originales (o a cualquier otro valor que consideres apropiado) cuando reviva
    this.statusManager.activate(STATUS_APPLICATION_MOMENTS.AFTER_REVIVE);
  }
}

export default Character;

export {
  Character,
};
