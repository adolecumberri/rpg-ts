import { ATTACK_TYPE } from "..";
import { getDefaultAttackObject, getRandomInt } from "../helpers";
import { AttackResult, AttackType, Constructor, DefenceResult, Stats } from "../types";


class Character {
  id: string;
  name: string;
  stats: Stats;
  originalStats: Partial<Stats> = {};
  isAlive: boolean;

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
        attackType = ATTACK_TYPE.MISS;
    } else if (critRoll < this.stats.crit) {
        // Si el roll es menor que la estadística de crítico del personaje, es un golpe crítico.
        attackType = ATTACK_TYPE.CRITICAL;
    } else {
        // Si ninguna de las condiciones anteriores se cumple, es un golpe normal.
        attackType = ATTACK_TYPE.NORMAL;
    }

    const damage = this.calculateDamage(attackType, this.stats);
  
    const solution = getDefaultAttackObject();
    solution.type = attackType;
    solution.value = damage;
  
    return solution;
}

  defend(attack: AttackResult): DefenceResult | any {
    // Aquí podrías implementar la lógica para determinar si la defensa resulta en 'miss', 'normal' o 'evasion'
    // y modificar las stats del personaje en consecuencia (por ejemplo, reduciendo su salud)
  }

  die() {
    this.isAlive = false;
  }

  private damageCalculation = {
    [ATTACK_TYPE.CRITICAL]: (stats: Stats) => stats.attack * stats.critMultiplier,
    [ATTACK_TYPE.NORMAL]: (stats: Stats) => stats.attack,
    [ATTACK_TYPE.MISS]: (_: Stats) => 0
  };

  calculateDamage(type: AttackType, stats: Stats): number {
    if (!(type in this.damageCalculation)) {
      throw new Error(`Invalid attack type: ${type}`);
    }

    return this.damageCalculation[type](stats);
  }

  revive() {
    this.isAlive = true;
    // Aquí puedes implementar la lógica para restaurar las stats del personaje a sus valores originales (o a cualquier otro valor que consideres apropiado) cuando reviva
  }

}

export default Character;
