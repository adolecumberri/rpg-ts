import { uniqueID } from '../helpers';
import { CharacterStats } from './components';
import { BasicStats } from './types';


class Character<T extends BasicStats> {
    id: number;
    stats: CharacterStats<T> & T;

    constructor(init: { stats: T & Record<string, number | string | boolean> }) {
        this.id = this.generateUniqueID();
        this.stats = new CharacterStats<T>(init.stats) as CharacterStats<T> & T;
    }

    // Ejemplo de una función que usa las estadísticas mínimas
    takeDamage(amount: number) {
        this.stats.hp -= amount;
        console.log(`Character took ${amount} damage, remaining HP: ${this.stats.hp}`);
    }

    private generateUniqueID(): number {
        // Generar un ID único para el personaje
        return Math.floor(Math.random() * 10000);
    }
}

const a = new Character({ stats: { hp: 10, hpHardcore: 100, attack: 5, defence: 2, agua: 'si'} });
a.stats.attack;

export { Character };
