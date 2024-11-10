import { ATTACK_TYPE } from '../common/common.constants';
import { uniqueID } from './../common/common.helpers';
import { DEFAULT_ATTACK_CALCULATION } from './character.constants';
import { CharacterConstructor, DamageCalculation } from './character.types';
import { Stats } from './components';

/**
 * Crea un nuevo personaje.
 * @param {Partial<Character>} con - Un objeto que contiene los datos iniciales para el personaje.
 */
class Character<T extends {} = {}> {
    id: number;
    stats: Stats<T> & T;

    constructor(con?: CharacterConstructor<T>) {
        this.id = uniqueID();
        this.stats = new Stats(con?.stats) as Stats<T> & T;
    }

    damageCalculation: DamageCalculation = DEFAULT_ATTACK_CALCULATION;


    // Ejemplo de una función que usa las estadísticas mínimas
    private takeDamage(amount: number) {
        this.stats.hp -= amount;
        console.log(`Character took ${amount} damage, remaining HP: ${this.stats.hp}`);
    }
}

export { Character };
