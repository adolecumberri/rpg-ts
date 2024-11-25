import { ATTACK_TYPE } from '../common/common.constants';
import { getRandomInt, uniqueID } from './../common/common.helpers';
import { DEFAULT_ATTACK_CALCULATION, DEFAULT_ATTACK_FUNCTION } from './character.constants';
import { AttackFunction, AttackResult, AttackType, CharacterConstructor, DamageCalculation } from './character.types';
import { Stats } from './components';

/**
 * Crea un nuevo personaje.
 * @param {Partial<Character>} con - Un objeto que contiene los datos iniciales para el personaje.
 */
class Character<AditionalStats extends {} = any> {
    id: number;
    stats: Stats<AditionalStats> & AditionalStats;

    constructor(con?: CharacterConstructor<AditionalStats>) {
        this.id = uniqueID();
        this.stats = new Stats(con?.stats) as Stats<AditionalStats> & AditionalStats;
    }

    private damageCalculation: DamageCalculation<AditionalStats> = DEFAULT_ATTACK_CALCULATION;

    addDamageCalculation(type: AttackType, calculation: DamageCalculation<AditionalStats>[AttackType]) {
        this.damageCalculation[type] = calculation;
    }

    /**
    * Realiza un ataque.
    * @returns {AttackResult} - Los detalles del ataque, incluyendo el tipo y el daño.
    */
    private _attack:AttackFunction = DEFAULT_ATTACK_FUNCTION;

    get attack(): AttackFunction {
        return this._attack;
    }

    set attack(newAttackFunction: AttackFunction) {
        this._attack = newAttackFunction.bind(this);
    }

    /**
   * Calcula el daño en función del tipo de ataque y las estadísticas.
   * @param {AttackType} type - El tipo de ataque.
   * @param {Stats} stats - Las estadísticas actuales del personaje.
   * @returns {number} - El daño calculado.
   */
    calculateDamage(type: AttackType): number {
        if ( !this.damageCalculation[type] ) {
            throw new Error(`No damage calculation function for: ${type}`);
        }

        return this.damageCalculation[type](this.stats);
    }

    isAlive(): boolean {
        return this.stats.isAlive === 1;
    }

    removeDamageCalculation(type: AttackType) {
        delete this.damageCalculation[type];
    }
}

export { Character };
