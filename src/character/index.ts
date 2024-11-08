import { uniqueID } from '../helpers';
import { Stats } from './components';
import { BasicStats } from './types';


class Character<T> {
    id: number;
    stats: Stats<T> & T;

    constructor(con) {
        this.id = this.generateUniqueID();
        this.stats = new Stats(con.stats) as Stats<T> & T;
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

export { Character };
