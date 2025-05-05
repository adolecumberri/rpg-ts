import { getRandomInt, uniqueID } from '../helpers/common.helpers';
import { AttackFunction, AttackResult, AttackType, DamageCalculation, DefenceFunction, DefenceResult } from '../types/combat.types';


import { CombatBehavior } from './CombatBehavior';
import { Stats } from './Stats';
import StatusManager from './StatusManager';


/**
 * Crea un nuevo personaje.
 * @param {Partial<Character>} con - Un objeto que contiene los datos iniciales para el personaje.
 */
class Character<AdditionalStats extends object = any, data extends object | undefined = {}> {
    combat: CombatBehavior = new CombatBehavior();
    id: number;
    stats: Stats<AdditionalStats> & AdditionalStats;
    data: data;
    statusManager: StatusManager;

    constructor(con?: any) {
        this.id = uniqueID();
        this.stats = new Stats(con?.stats as AdditionalStats) as Stats<AdditionalStats> & AdditionalStats;
        this.data = con?.data as data;

        if (con?.statusManager) {
            this.statusManager = new StatusManager();
        }
    }

    addDamageCalculation(type: AttackType, calculation: DamageCalculation[AttackType]) {
        this.combat.damageCalculation[type] = calculation;
    }

    get attack(): AttackFunction {
        return this.combat.attack;
    }

    set attack(newAttackFunction: AttackFunction) {
        this.combat.attack = newAttackFunction.bind(this);
    }

    get damageCalculation() {
        return this.combat.damageCalculation(); // this will get the hole object
    }

    calculateDamage(type: AttackType): number {
        return this.combat.calculateDamage(type, this.stats);
    }

    get defence(): DefenceFunction {
        return this.combat.defence;
    }

    set defence(newDefenceFunction: DefenceFunction) {
        this.combat.defence = newDefenceFunction.bind(this);
    }

    set defenceCalculation(newDefenceCalculation: (attack: AttackResult) => number) {
        this.combat.defenceCalculation = newDefenceCalculation.bind(this);
    }

    isAlive(): boolean {
        return this.stats.get('isAlive') === 1;
    }

    receiveDamage(damage: DefenceResult): void {
        this.stats.receiveDamage(damage.value);
    }
}

// type DynamicCharacterConstructor = {
//     new <T extends object, U extends object>(arg?: T & { stats?: U }): Omit<T, 'stats'> & {
//         [x in keyof BaseCharacter]: BaseCharacter<U>[x]
//     }
// }

// const Character = BaseCharacter as DynamicCharacterConstructor;
// type Character = InstanceType<typeof Character>;


export default { Character };
export { Character };
