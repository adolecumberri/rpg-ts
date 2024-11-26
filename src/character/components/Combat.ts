import { DEFAULT_ATTACK_CALCULATION, DEFAULT_ATTACK_FUNCTION } from '../character.constants';
import { AttackFunction, AttackType, DamageCalculation } from '../character.types';
import { Stats } from './Stats';

class Combat<AditionalStats extends {} = any> {
    private _attack: AttackFunction = DEFAULT_ATTACK_FUNCTION;
    private _damageCalculation: DamageCalculation<AditionalStats> = DEFAULT_ATTACK_CALCULATION;

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
    calculateDamage(type: AttackType, stats: Stats<AditionalStats> & AditionalStats): number {
        if ( !this.damageCalculation[type] ) {
            throw new Error(`No damage calculation function for: ${type}`);
        }

        return this.damageCalculation[type](stats);
    }

    get damageCalculation(): DamageCalculation<AditionalStats> {
        return this._damageCalculation;
    }

    set damageCalculation(newDamageCalculation: DamageCalculation<AditionalStats>) {
        this._damageCalculation = newDamageCalculation;
    }

    removeDamageCalculation(type: AttackType) {
        delete this._damageCalculation[type];
    }
}

export { Combat };
