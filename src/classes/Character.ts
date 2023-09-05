
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
  Stats,
  DefenceObject,
} from '../types';
import { ActionRecord, CallBacksManager, Status, StatusManager } from './';
import LevelManager from './characterModules/LevelManager';
import { SkillManager } from './characterModules/SkillManager';


class Character<StatsType extends Stats = Stats> {
  id: number = uniqueID();
  name: string = '';
  surname: string = '';
  className: string = '';
  kills: number = 0;
  deaths: number = 0;
  isAlive: boolean = true;
  statsController: {[key in keyof StatsType]?: {max?: number, min?: number}} = {};
  stats: StatsType;
  originalStats: Partial<StatsType> = {};
  skillManager: SkillManager | null = null;
  statusManager: StatusManager | null = null;
  callbacksManager: CallBacksManager | null= null;
  actionRecord: ActionRecord | null = null;
  levelManager: LevelManager | null = null;

  damageCalculation = {
    [ATTACK_TYPE_CONST.CRITICAL]: (stats: Stats) => Math.round(stats.critMultiplier > 1 ?
      stats.attack * (1 + (stats.critMultiplier / 100)) :
      stats.attack * (1 + stats.critMultiplier)),
    [ATTACK_TYPE_CONST.NORMAL]: (stats: Stats) => stats.attack,
    [ATTACK_TYPE_CONST.MISS]: (_: Stats) => 0,
  };

  /**
 * Crea un nuevo personaje.
 * @param {CharacterConstructor} con - Un objeto que contiene los datos iniciales para el personaje.
 */
  constructor(con) {
    if (con) {
      Object.assign(this, con);

      let totalHpProvided = con.stats?.totalHp ?? DEFAULT_STATS_OBJECT.totalHp;
      const hpProvided = con.stats?.hp ?? DEFAULT_STATS_OBJECT.hp;

      totalHpProvided = Math.max(totalHpProvided, hpProvided);

      this.stats = Object.assign(
        getDefaultStatsObject(),
        con.stats,
        {
          totalHp: totalHpProvided,
          hp: hpProvided,
        },
      );

      this.originalStats = this.stats;

      this.assignIfInstance('statusManager', this, con);
      this.assignIfInstance('actionRecord', this, con);
      this.assignIfInstance('levelManager', this, con);
      this.assignIfInstance('skillManager', this, con);
      this.assignIfInstance('callbacksManager', this, con);
    } else {
      this.stats = getDefaultStatsObject() as StatsType;
      this.originalStats = this.stats;
      this.statusManager = null;
      this.actionRecord = null;
      this.levelManager = null;
    }
  }


  /**
 * Añade un nuevo estado al personaje.
 * @param {Status[] | Status} status - El estado o estados a añadir.
 */
  addStatus(status: Status[] | Status) {
    this.statusManager?.addStatus(status, this);
  }

  addStat(stat: keyof Stats, value: number) {
    // if the stat exist in stat controller, controll it with max and min
    if (this.statsController[stat]) {
      if (this.statsController[stat].max) {
        value = Math.min(this.statsController[stat].max, value);
      }
      if (this.statsController[stat].min) {
        value = Math.max(this.statsController[stat].min, value);
      }
    }

    this.stats[stat] += value;
  }

  /**
 * Realiza un ataque.
 * @returns {AttackResult} - Los detalles del ataque, incluyendo el tipo y el daño.
 */
  attack(target?: Character): AttackResult {
    const accuracyRoll = getRandomInt(0, 99); // Genera un número entre 0 y 100.
    const critRoll = getRandomInt(0, 99); // Genera un número entre 0 y 100.

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
        this.callbacksManager.useCallback('missAttack', { c: this, attack: solution, target });
        this.skillManager?.useSkill('missAttack', { c: this, attack: solution, target});
        break;
      case ATTACK_TYPE_CONST.CRITICAL:
        this.callbacksManager.useCallback('criticalAttack', { c: this, attack: solution, target });
        this.skillManager?.useSkill('criticalAttack', { c: this, attack: solution, target});
        break;
      case ATTACK_TYPE_CONST.NORMAL:
        this.callbacksManager.useCallback('normalAttack', { c: this, attack: solution, target });
        this.skillManager?.useSkill('normalAttack', { c: this, attack: solution, target});
        break;
    }

    solution.recordId = this.actionRecord?.recordAttack(attackType, damage, this.id);
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_ATTACK, this);
    this.callbacksManager.useCallback('afterAnyAttack', { c: this, attack: solution, target });
    this.skillManager?.useSkill('afterAnyAttack', { c: this, attack: solution, target });
    return solution;
  }

  afterBattle(): any {
    this.statusManager?.removeAllStatuses(this);
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_BATTLE, this);
    this.callbacksManager.useCallback('afterBattle', {c: this});
    this.skillManager?.useSkill('afterBattle', {c: this});
  }

  afterTurn(): any {
    this.callbacksManager.useCallback('afterTurn', {c: this});
    this.skillManager.useSkill('afterTurn', {c: this});
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_TURN, this);
  }

  private assignIfInstance<T>(property: keyof T, target: T, source: Partial<T>): void {
    if (source[property] instanceof target[property].constructor) {
      target[property] = source[property];
    } else {
      target[property] = null;
    }
  }

  beforeBattle(): any {
    this.callbacksManager.useCallback('beforeBattle', {c: this});
    this.skillManager?.useSkill('beforeBattle', {c: this});
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_BATTLE, this);
  }

  beforeTurn(): any {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_TURN, this);
    this.callbacksManager.useCallback('beforeTurn', {c: this});
    this.skillManager?.useSkill('beforeTurn', {c: this});
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
  * @returns {DefenceObject} - Los detalles de la defensa, incluyendo el tipo y el daño absorbido.
  */
  defend(attack: AttackResult): DefenceObject {
    const defence: DefenceObject = getDefaultDefenceObject({ attacker: attack.atacker });
    let callbackResult: any | undefined;
    let skillResult: any;

    // Si el ataque falla, no se hace daño.
    if (attack.type === ATTACK_TYPE_CONST.MISS) {
      defence.type = DEFENCE_TYPE_CONST.MISS;
      defence.value = 0;
      this.callbacksManager.useCallback('missDefence', { c: this, defence, attack, target: attack.atacker });
      this.skillManager?.useSkill('missDefence', { c: this, defence, attack, target: attack.atacker });
    } else if (attack.type === ATTACK_TYPE_CONST.TRUE) { // Si el ataque es verdadero, pasa sin modificarse.
      defence.type = DEFENCE_TYPE_CONST.TRUE;
      defence.value = attack.value;
      this.callbacksManager.useCallback('trueDefence', { c: this, defence, attack, target: attack.atacker });
      this.skillManager?.useSkill('trueDefence', { c: this, defence, attack, target: attack.atacker });
    } else { // Para ataques normales y críticos, se calcula el daño teniendo en cuenta la defensa y la evasión.
      const evasionRoll = getRandomInt(0, 100);
      if (evasionRoll <= this.stats.evasion) {
        defence.type = DEFENCE_TYPE_CONST.EVASION;
        defence.value = 0;
        this.callbacksManager.useCallback('evasionDefence', { c: this, defence, attack });
        this.skillManager?.useSkill('evasionDefence', { c: this, defence, attack });
      } else {
        defence.type = DEFENCE_TYPE_CONST.NORMAL;
        defence.value = this.defenceCalculation(attack.value);
        this.callbacksManager.useCallback('normalDefence', { c: this, defence, attack });
        this.skillManager?.useSkill('normalDefence', { c: this, defence, attack });
      }
    }

    defence.recordId = this.actionRecord?.recordDefence(defence.type, defence.value, this.id, attack.atacker.id);
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_DEFENCE, this);
    this.callbacksManager.useCallback('afterAnyDefence', { c: this, defence, attack });
    this.skillManager.useSkill('afterAnyDefence', { c: this, defence, attack });
    return defence;
  }

  /**
  * Método para calcular la defensa.
  * @param {number} attack - El valor del ataque a defender.
  * @returns {number} - El daño después de aplicar la defensa.
  */
  defenceCalculation = (attack: number) => Math.round(attack * 40 / (40 + this.stats.defence));

  static deserialize(data: string): Character {
    const parsedData = JSON.parse(data);

    // Deserialize nested objects
    if (parsedData.statusManager) {
      parsedData.statusManager = StatusManager.deserialize(parsedData.statusManager);
    }
    if (parsedData.actionRecord) {
      parsedData.actionRecord = ActionRecord.deserialize(parsedData.actionRecord);
    }
    if (parsedData.levelManager) {
      parsedData.levelManager = LevelManager.deserialize(parsedData.levelManager);
    }
    if (parsedData.skillManager) {
      parsedData.skillManager = SkillManager.deserialize(parsedData.skillManager);
    }
    if (parsedData.callbacksManager) {
      parsedData.callbacksManager = CallBacksManager.deserialize(parsedData.callbacksManager);
    }

    return new Character(parsedData);
  }

  die(target?: Character) {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_DIE, this);
    this.isAlive = false;
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_DIE, this);
    this.callbacksManager.useCallback('die', { c: this, target });
    this.statusManager?.removeAllStatuses(this);
  }

  gainExperience(amount: number) {
    this.levelManager?.gainExperience(amount, this);
  }

  /**
  * Aplica daño al personaje.
  * @param {number} damage - El daño a aplicar.
  */
  receiveDamage(defence: DefenceObject) {
    this.updateHp(defence.value * -1, defence.attacker); // defence.value es el dañor que el personaje recibe.
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_RECEIVE_DAMAGE, this);
    this.callbacksManager.useCallback('receiveDamage', { c: this, defence, target: defence.attacker });
    this.skillManager.useSkill('receiveDamage', { c: this, defence, target: defence.attacker });
  }

  /**
   * Elimina un estado del personaje por su ID.
   * @param {number} id - El ID del estado a eliminar.
   */
  removeStatus(id: number) {
    this.statusManager?.removeStatusById(id, this);
    this.callbacksManager.useCallback('removeStatus', { c: this });
  }

  revive() {
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.BEFORE_REVIVE, this);
    this.isAlive = true;
    // Aquí puedes implementar la lógica para restaurar las stats del personaje a sus valores originales (o a cualquier otro valor que consideres apropiado) cuando reviva
    this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_REVIVE, this);
    this.callbacksManager.useCallback('revive', { c: this });
  }

  /*
    this function serialize (parse string generaly) the attributes, NOT the functions.
  */
  serialize() {
    const serialized = {
      id: this.id,
      isAlive: this.isAlive,
      name: this.name,
      originalStats: this.originalStats,
      skill: this.skillManager.serialize(),
      stats: this.stats,
      callbacksManager: this.callbacksManager.serialize(),
      skillManager: this.skillManager.serialize(),
      damageCalculation: this.damageCalculation,
      actionRecord: this.actionRecord.serialize(),
      statusManager: this.statusManager.serialize(),
      levelManager: this.levelManager.serialize(),
    };

    return JSON.stringify(serialized);
  }

  /**
   * Actualiza la salud del personaje.
   * @param {number} amount - La cantidad de salud a añadir o restar.
   */
  updateHp(amount: number, attacker?: Character): void {
    this.stats.hp = Math.min(this.stats.totalHp, Math.max(0, this.stats.hp + amount));

    if (this.stats.hp <= 0) {
      this.die(attacker);
    }

    this.callbacksManager.useCallback('updateHp', { c: this });
    this.skillManager.useSkill('updateHp', { c: this });
  }
}

export default Character;

export {
  Character,
};
