
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
  CharacterCallbacks,
  CharacterConstructor,
  DefenceResult,
  DynamicCharacterConstructor,
  Stats,
} from '../types';
import { ActionRecord, Status, StatusManager } from './';


class BaseCharacter {
  id: number = uniqueID();
  isAlive: boolean = true;
  name: string = '';
  originalStats: Partial<Stats> = {};
  skill: {
    isUsed: boolean;
    probability: number,
    use: any,
  };
  stats: Stats;
  statusManager: StatusManager | null = null;
  callbacks: CharacterCallbacks = {};
  actionRecord: ActionRecord | null = null;

  damageCalculation = {
    [ATTACK_TYPE_CONST.CRITICAL]: (stats: Stats) => stats.attack * stats.critMultiplier,
    [ATTACK_TYPE_CONST.NORMAL]: (stats: Stats) => stats.attack,
    [ATTACK_TYPE_CONST.MISS]: (_: Stats) => 0,
  };

  /**
 * Crea un nuevo personaje.
 * @param {CharacterConstructor} con - Un objeto que contiene los datos iniciales para el personaje.
 */
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
    this.actionRecord = con?.actionRecord ? new ActionRecord() : null;
  }

  /**
 * Añade un nuevo estado al personaje.
 * @param {Status[] | Status} status - El estado o estados a añadir.
 */
  addStatus(status: Status[] | Status) {
    this.statusManager?.addStatus(status);
  }

  /**
 * Realiza un ataque.
 * @returns {AttackResult} - Los detalles del ataque, incluyendo el tipo y el daño.
 */
  attack(): AttackResult {
    const accuracyRoll = getRandomInt(0, 99); // Genera un número entre 0 y 100.
    const critRoll = getRandomInt(0, 99); // Genera un número entre 0 y 100.
    let callbackResult: AttackResult | undefined;

    let attackType: AttackType;

    if (accuracyRoll >= this.stats.accuracy) {
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

    const solution = getDefaultAttackObject({ atacker: this, type: attackType, value: damage });

    // Llama a los callbacks después de calcular el daño.
    switch (attackType) {
      case ATTACK_TYPE_CONST.MISS:
        callbackResult = this.callbacks.missAttack?.(solution);
        break;
      case ATTACK_TYPE_CONST.CRITICAL:
        callbackResult = this.callbacks.criticalAttack?.(solution);
        break;
      case ATTACK_TYPE_CONST.NORMAL:
        callbackResult = this.callbacks.normalAttack?.(solution);
        break;
    }

    this.actionRecord?.recordAttack(attackType, damage);
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_ATTACK);
    callbackResult = this.callbacks.afterAnyAttack?.(solution);
    return callbackResult || solution;
  }

  afterBattle(): any {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_BATTLE);
    this.statusManager?.removeAllStatuses();
    this.callbacks.afterBattle?.(this);
    // Aquí pueden realizarse otras acciones necesarias después de la batalla.
  }

  afterTurn(): any {
    const callbackResponse = this.callbacks.afterTurn?.(this);
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_TURN);
    // Aquí pueden realizarse otras acciones necesarias después del turno.
    return callbackResponse;
  }

  beforeBattle(): any {
    const callbackResponse = this.callbacks.beforeBattle?.(this);
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_BATTLE);
    // Aquí pueden realizarse otras acciones necesarias antes de la batalla.
    return callbackResponse;
  }

  beforeTurn(): any {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_TURN);
    this.callbacks.beforeTurn?.(this);
    // Aquí pueden realizarse otras acciones necesarias antes del turno.
  }

  /**
   * Calcula el daño en función del tipo de ataque y las estadísticas.
   * @param {AttackType} type - El tipo de ataque.
   * @param {Stats} stats - Las estadísticas actuales del personaje.
   * @returns {number} - El daño calculado.
   */
  calculateDamage(type: AttackType, stats: Stats): number {
    if (!(type in this.damageCalculation)) {
      throw new Error(`Invalid attack type: ${type}`);
    }

    return this.damageCalculation[type](stats);
  }

  /**
  * Defiende de un ataque.
  * @param {AttackResult} attack - El ataque a defender.
  * @returns {DefenceResult} - Los detalles de la defensa, incluyendo el tipo y el daño absorbido.
  */
  defend(attack: AttackResult): DefenceResult {
    const defence: DefenceResult = getDefaultDefenceObject({ attacker: attack.atacker });
    let callbackResult: DefenceResult | undefined;

    // Si el ataque falla, no se hace daño.
    if (attack.type === ATTACK_TYPE_CONST.MISS) {
      defence.type = DEFENCE_TYPE_CONST.MISS;
      defence.value = 0;
      callbackResult = this.callbacks?.missDefence?.({ c: this, defence, attack });
    } else if (attack.type === ATTACK_TYPE_CONST.TRUE) { // Si el ataque es verdadero, pasa sin modificarse.
      defence.type = DEFENCE_TYPE_CONST.TRUE;
      defence.value = attack.value;
      callbackResult = this.callbacks?.trueDefence?.({ c: this, defence, attack });
    } else { // Para ataques normales y críticos, se calcula el daño teniendo en cuenta la defensa y la evasión.
      const evasionRoll = getRandomInt(0, 100);
      if (evasionRoll <= this.stats.evasion) {
        defence.type = DEFENCE_TYPE_CONST.EVASION;
        defence.value = 0;
        callbackResult = this.callbacks?.evasionDefence?.({ c: this, defence, attack });
      } else {
        defence.type = DEFENCE_TYPE_CONST.NORMAL;
        defence.value = this.defenceCalculation(attack.value);
        callbackResult = this.callbacks?.normalDefence?.({ c: this, defence, attack });
      }
    }

    this.actionRecord?.recordDefence(defence.type, defence.value);
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_DEFENCE);
    callbackResult = this.callbacks?.afterAnyDefence?.({ c: this, defence, attack });

    return callbackResult || defence;
  }

  /**
  * Método para calcular la defensa.
  * @param {number} attack - El valor del ataque a defender.
  * @returns {number} - El daño después de aplicar la defensa.
  */
  defenceCalculation = (attack: number) => attack * 40 / (40 + this.stats.defence);

  die() {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_DIE);
    this.isAlive = false;
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_DIE);
    this.callbacks.die?.(this);
    this.statusManager?.removeAllStatuses();
  }

  /**
  * Aplica daño al personaje.
  * @param {number} damage - El daño a aplicar.
  */
  receiveDamage(defence: DefenceResult) {
    this.updateHp(defence.value * -1); // defence.value es el dañor que el personaje recibe.
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_RECEIVE_DAMAGE);
    this.callbacks.receiveDamage?.({ c: this, defence });
  }

  /**
   * Elimina un estado del personaje por su ID.
   * @param {number} id - El ID del estado a eliminar.
   */
  removeStatus(id: number) {
    this.statusManager?.removeStatusById(id);
    this.callbacks.removeStatus?.(this);
  }

  revive() {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_REVIVE);
    this.isAlive = true;
    // Aquí puedes implementar la lógica para restaurar las stats del personaje a sus valores originales (o a cualquier otro valor que consideres apropiado) cuando reviva
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_REVIVE);
    this.callbacks.revive?.(this);
  }

  /**
   * Actualiza la salud del personaje.
   * @param {number} amount - La cantidad de salud a añadir o restar.
   */
  updateHp(amount: number): void {
    this.stats.hp = Math.min(this.stats.totalHp, Math.max(0, this.stats.hp + amount));

    if (this.stats.hp <= 0) {
      this.die();
    }

    this.callbacks.updateHp?.(this);
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
