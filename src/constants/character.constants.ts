
import { getRandomInt } from '../helpers/common.helpers';
import { Character } from '../Classes/Character';
import { getDefaultAttackObject, getDefaultDefenceObject } from '../helpers/Character.helpers';

import { ATTACK_TYPE, DEFENCE_TYPE } from './combat.constants';
import {
    AttackResult,
    DefenceResult,
    DamageCalculation,
    DefenceCalculation,
    AttackFunction,
    AttackType,
    DefenceFunction,
} from '../types/combat.types';


const DEFAULT_ATTACK_OBJECT: AttackResult = {
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

const DEFAULT_DEFENCE_OBJECT: DefenceResult = {
    type: ATTACK_TYPE.NORMAL,
    value: 0,
};

const DEFAULT_ATTACK_FUNCTION: AttackFunction = function(this: Character<{accuracy: number, crit: number}>) {
    const accuracyRoll = getRandomInt(0, 99); // Genera un número entre 0 y 100.
    const critRoll = getRandomInt(0, 99); // Genera un número entre 0 y 100.

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

export {
    DEFAULT_ATTACK_OBJECT,
    DEFAULT_ATTACK_FUNCTION,
    DEFAULT_DEFENCE_OBJECT,
};
