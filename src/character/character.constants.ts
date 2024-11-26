
import { ATTACK_TYPE, DEFENCE_TYPE } from '../common/common.constants';
import { getRandomInt } from '../common/common.helpers';
import { Character } from './test';
import { getDefaultAttackObject, getDefaultDefenceObject } from './character.helpers';
import { AttackFunction, AttackResult, AttackType, DamageCalculation, DefenceResult } from './character.types';
import { Stats } from './components';

const DEFAULT_ATTACK_OBJECT: AttackResult = {
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

const DEFAULT_DEFENCE_OBJECT: DefenceResult = {
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

const DEFAULT_ATTACK_CALCULATION: DamageCalculation = {
    // [ATTACK_TYPE.CRITICAL]: (stats) => stats.attack * (stats.critMultiplier ?? 2),
    [ATTACK_TYPE.NORMAL]: (stats) => stats.attack,
    [ATTACK_TYPE.MISS]: () => 0,
};

const DEFAULT_ATTACK_FUNCTION: AttackFunction = function(this: Character<{accuracy: number, crit: number}>) {
    const accuracyRoll = getRandomInt(0, 99); // Genera un número entre 0 y 100.
    const critRoll = getRandomInt(0, 99); // Genera un número entre 0 y 100.
    let callbackResult: AttackResult | undefined;

    let attackType: AttackType;

    if (accuracyRoll >= this.stats.accuracy) {
        // Si el roll es mayor que la precisión del personaje, el ataque falla.
        attackType = ATTACK_TYPE.MISS;
        return getDefaultAttackObject({ atacker: this, type: attackType, value: 0 });
    };

    if (critRoll < this.stats.crit) {
        // Si el roll es menor que la estadística de crítico del personaje, es un golpe crítico.
        attackType = ATTACK_TYPE.CRITICAL;
    } else {
        // Si ninguna de las condiciones anteriores se cumple, es un golpe normal.
        attackType = ATTACK_TYPE.NORMAL;
    }

    const damage = this.calculateDamage(attackType);

    const solution = getDefaultAttackObject({ atacker: this, type: attackType, value: damage });

    // Llama a los callbacks después de calcular el daño.
    // switch (attackType) {
    // case ATTACK_TYPE.MISS:
    //     callbackResult = this.callbacks.missAttack?.(solution);
    //     break;
    // case ATTACK_TYPE.CRITICAL:
    //     callbackResult = this.callbacks.criticalAttack?.(solution);
    //     break;
    // case ATTACK_TYPE.NORMAL:
    //     callbackResult = this.callbacks.normalAttack?.(solution);
    //     break;
    // }

    return solution;
};

const DEFAULT_DEFENCE_FUNCTION = function(this: Character, attack: AttackResult ) {
    const defence: DefenceResult = getDefaultDefenceObject({ attacker: attack.atacker });
    let callbackResult: DefenceResult | undefined;

    // Si el ataque falla, no se hace daño.
    if (attack.type === ATTACK_TYPE.MISS) {
        defence.type = DEFENCE_TYPE.MISS;
        defence.value = 0;
    } else if (attack.type === ATTACK_TYPE.TRUE) { // Si el ataque es verdadero, pasa sin modificarse.
        defence.type = DEFENCE_TYPE.TRUE;
        defence.value = attack.value;
    } else { // Para ataques normales y críticos, se calcula el daño teniendo en cuenta la defensa y la evasión.
        const evasionRoll = getRandomInt(0, 100);
        if (evasionRoll <= this.stats.evasion) {
            defence.type = DEFENCE_TYPE.EVASION;
            defence.value = 0;
        } else {
            defence.type = DEFENCE_TYPE.NORMAL;
            defence.value = this.defenceCalculation(attack.value);
        }
    }

    // defence.recordId = this.actionRecord?.recordDefence(defence.type, defence.value, this.id, attack.atacker.id);
    // this.statusManager?.activate(STATUS_APPLICATION_MOMENTS.AFTER_DEFENCE, this);
    // callbackResult = this.callbacks?.defence?.({ c: this, defence, attack });

    return callbackResult || defence;
};

export {
    DEFAULT_ATTACK_OBJECT,
    DEFAULT_ATTACK_CALCULATION,
    DEFAULT_ATTACK_FUNCTION,
    DEFAULT_DEFENCE_OBJECT,
    DEFAULT_DEFENCE_FUNCTION,
};
