
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from "../constants";
import { getDefaultAttackObject, getDefaultDefenceObject, getRandomInt } from "../helpers";
import { AttackResult, AttackType, Constructor, DefenceResult, Stats } from "../types";


class Character {
  id: string;
  name: string;
  stats: Stats;
  originalStats: Partial<Stats> = {};
  isAlive: boolean;

  private damageCalculation = {
    [ATTACK_TYPE_CONST.CRITICAL]: (stats: Stats) => stats.attack * stats.critMultiplier,
    [ATTACK_TYPE_CONST.NORMAL]: (stats: Stats) => stats.attack,
    [ATTACK_TYPE_CONST.MISS]: (_: Stats) => 0
  };

  constructor(con?: Constructor) {
    con && Object.assign(this, con);

    this.originalStats = con?.stats || {};

    const totalHpProvided = con?.stats?.totalHp ?? 0;
    const hpProvided = con?.stats?.hp ?? 0;

    this.stats.totalHp = Math.max(totalHpProvided, hpProvided);
    this.stats.hp = hpProvided > this.stats.totalHp ? this.stats.totalHp : hpProvided;
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

  defend(attack: AttackResult): DefenceResult {
    let defence: DefenceResult = getDefaultDefenceObject();

    // Si el ataque falla, no se hace daño.
    if (attack.type === ATTACK_TYPE_CONST.MISS) {
      defence.type = DEFENCE_TYPE_CONST.MISS;
      defence.value = 0;
    }
    // Si el ataque es verdadero, pasa sin modificarse.
    else if (attack.type === ATTACK_TYPE_CONST.TRUE) {
      defence.type = DEFENCE_TYPE_CONST.NORMAL; // asumiremos que el tipo es 'NORMAL' para un ataque verdadero.
      defence.value = attack.value;
    }
    // Para ataques normales y críticos, se calcula el daño teniendo en cuenta la defensa y la evasión.
    else {
      let evasionRoll = getRandomInt(100); // Genera un número entre 0 y 100.
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

  calculateDamage(type: AttackType, stats: Stats): number {
    if (!(type in this.damageCalculation)) {
      throw new Error(`Invalid attack type: ${type}`);
    }

    return this.damageCalculation[type](stats);
  }

  defenceCalculation = (attack: number) => attack * 40 / (40 + this.stats.defence);

  die() {
    this.isAlive = false;
  }

  revive() {
    this.isAlive = true;
    // Aquí puedes implementar la lógica para restaurar las stats del personaje a sus valores originales (o a cualquier otro valor que consideres apropiado) cuando reviva
  }
}

export default Character;
