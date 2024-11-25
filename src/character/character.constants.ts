
import { ATTACK_TYPE } from '../common/common.constants';
import { getRandomInt } from '../common/common.helpers';
import { Character } from './character';
import { getDefaultAttackObject } from './character.helpers';
import { AttackFunction, AttackResult, AttackType, DamageCalculation } from './character.types';
import { Stats } from './components';

const DEFAULT_ATTACK_OBJECT: AttackResult = {
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
    // case ATTACK_TYPE_CONST.MISS:
    //     callbackResult = this.callbacks.missAttack?.(solution);
    //     break;
    // case ATTACK_TYPE_CONST.CRITICAL:
    //     callbackResult = this.callbacks.criticalAttack?.(solution);
    //     break;
    // case ATTACK_TYPE_CONST.NORMAL:
    //     callbackResult = this.callbacks.normalAttack?.(solution);
    //     break;
    // }

    return solution;
};

export {
    DEFAULT_ATTACK_OBJECT,
    DEFAULT_ATTACK_CALCULATION,
    DEFAULT_ATTACK_FUNCTION,
};
