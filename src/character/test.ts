import { getRandomInt, uniqueID } from '../common/common.helpers';
import { AttackFunction, AttackType, CharacterConstructor, DamageCalculation } from './character.types';
import { Stats } from './components';
import { Combat } from './components/Combat';

/**
 * Crea un nuevo personaje.
 * @param {Partial<Character>} con - Un objeto que contiene los datos iniciales para el personaje.
 */
class Character<AditionalStats extends {} = any> {
    private combat = new Combat<AditionalStats>();
    id: number;
    stats: Stats<AditionalStats> & AditionalStats;

    constructor(con?: CharacterConstructor<AditionalStats>) {
        this.id = uniqueID();
        this.stats = new Stats(con?.stats) as Stats<AditionalStats> & AditionalStats;
    }


    addDamageCalculation(type: AttackType, calculation: DamageCalculation<AditionalStats>[AttackType]) {
        this.combat.damageCalculation[type] = calculation;
    }


    get attack(): AttackFunction {
        return this.combat.attack;
    }

    set attack(newAttackFunction: AttackFunction) {
        this.combat.attack = newAttackFunction.bind(this);
    }

    calculateDamage(type: AttackType): number {
        return this.combat.calculateDamage(type, this.stats);
    }

    isAlive(): boolean {
        return this.stats.isAlive === 1;
    }

    removeDamageCalculation(type: AttackType) {
        this.combat.removeDamageCalculation(type);
    }
}

export { Character };
