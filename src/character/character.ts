import { getRandomInt, uniqueID } from '../common/common.helpers';
import {
    AttackFunction,
    AttackResult,
    AttackType,
    CharacterConstructor,
    DamageCalculation,
    DefenceFunction,
    DefenceResult,
} from './character.types';
import { Stats } from './components';
import { Combat } from './components/Combat';


/**
 * Crea un nuevo personaje.
 * @param {Partial<Character>} con - Un objeto que contiene los datos iniciales para el personaje.
 */
class Character<AdditionalStats extends object = {}, AdditionalProps extends object = {}> {
    combat = new Combat<AdditionalStats>();
    id: number;
    stats: Stats<AdditionalStats> & AdditionalStats;
    props: AdditionalProps;

    constructor(con?: CharacterConstructor<AdditionalStats, AdditionalProps>) {
        this.id = uniqueID();
        this.stats = new Stats(con?.stats) as Stats<AdditionalStats> & AdditionalStats;

        // look props and if its there a function, bind "this" to it
        if ( con?.props ) {
            Object.entries(con?.props || {}).forEach(([key, value]) => {
                if (typeof value === 'function') {
                    (con.props as AdditionalProps)[key] = value.bind(this);
                }
            });
            this.props = con?.props || ({} as AdditionalProps);
        }
    }

    addDamageCalculation(type: AttackType, calculation: DamageCalculation<AdditionalStats>[AttackType]) {
        this.combat.damageCalculation[type] = calculation;
    }

    get attack(): AttackFunction {
        return this.combat.attack;
    }

    set attack(newAttackFunction: AttackFunction) {
        this.combat.attack = newAttackFunction.bind(this);
    }

    get damageCalculation() {
        return this.combat.damageCalculation; // this will get the hole object
    }

    set damageCalculation(newAttackCalculation: DamageCalculation<AdditionalStats>) {
        this.combat.damageCalculation = newAttackCalculation; // this will set the hole object
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

    get defenceCalculation() {
        return this.combat.defenceCalculation;
    }

    set defenceCalculation(newDefenceCalculation: (attack: AttackResult) => number) {
        this.combat.defenceCalculation = newDefenceCalculation.bind(this);
    }

    isAlive(): boolean {
        return this.stats.isAlive === 1;
    }

    receiveDamage(damage: DefenceResult): void {
        this.stats.hp -= damage.value;
    }

    removeDamageCalculation(type: AttackType) {
        this.combat.removeDamageCalculation(type);
    }
}

export { Character };
