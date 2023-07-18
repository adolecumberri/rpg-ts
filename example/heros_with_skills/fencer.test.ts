import { BaseCharacter, Character } from '../../src/classes';
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from '../../src/constants';
import { getDefaultDefenceObject, getRandomInt } from '../../src/helpers';
import { AttackResult, CharacterCallbacks } from '../../src/types';

// Función para calcular daño reflejado
const calculateReflectedDamage = (value: number) => {
    return getRandomInt(value * 0.85, value * 1.15);
};
const skillProbability = 100; // real value = 0.22
const Riposte: CharacterCallbacks['afterAnyDefence'] = ({ c, attack, defence }) => {
    // Verificar que los parametros existen
    if (!defence || !attack || !attack.atacker) return;

    if (
        defence?.type === DEFENCE_TYPE_CONST.MISS ||
        defence?.type === DEFENCE_TYPE_CONST.EVASION
    ) return;

    if (skillProbability <= getRandomInt(0, 100)) return defence; // if skill miss returns default defence

    const damageReflected = calculateReflectedDamage(attack?.value);

    const defenceResult = attack.atacker!.defend({
        type: ATTACK_TYPE_CONST.SKILL,
        value: damageReflected,
        atacker: c as BaseCharacter,
    });
    attack?.atacker?.receiveDamage(defenceResult);

    const solution = getDefaultDefenceObject({
        type: ATTACK_TYPE_CONST.SKILL,
        value: 0,
    });

    return solution;
};

const fencer = new Character({
    name: 'Fencer',
    className: 'Fencer',
    statusManager: true,
    actionRecord: true,
    callbacks: {
        afterAnyDefence: Riposte,
    },
});


describe('Fencer Character', () => {
    let enemy: Character;

    beforeEach(() => {
        // Define an enemy character before each test
        enemy = new Character({
            name: 'Enemy',
            className: 'Enemy',
            statusManager: true,
            actionRecord: true,
        });
    });

    it('should riposte when attack is not a MISS or EVASION and skill hits', () => {
        const spyDefend = jest.spyOn(enemy, 'defend');
        const spyReceiveDamage = jest.spyOn(enemy, 'receiveDamage');
        const attack: AttackResult = enemy.attack();

        // Act
        fencer.defend(attack);

        // Assert
        expect(spyDefend).toHaveBeenCalled();
        expect(spyReceiveDamage).toHaveBeenCalled();

        // Reset mock
        jest.spyOn(global.Math, 'random').mockRestore();
    });

    it('should not riposte when attack is a MISS', () => {
        const spyDefend = jest.spyOn(enemy, 'defend');
        const attack: AttackResult = {
            type: ATTACK_TYPE_CONST.MISS,
            value: 100,
            atacker: enemy,
        };

        // Act
        fencer.defend(attack);

        // Assert
        expect(spyDefend).not.toHaveBeenCalled();
    });

    it('should not riposte when defend is an EVASION', () => {
        fencer.stats.evasion = 100;
        const spyDefend = jest.spyOn(enemy, 'defend');
        const attack: AttackResult = {
            type: ATTACK_TYPE_CONST.NORMAL,
            value: 100,
            atacker: enemy,
        };

        // Act
        fencer.defend(attack);

        // Assert
        expect(spyDefend).not.toHaveBeenCalled();
    });

    it('should not riposte when skill does not hit', () => {
        const spyDefend = jest.spyOn(enemy, 'defend');
        const attack: AttackResult = {
            type: ATTACK_TYPE_CONST.NORMAL,
            value: 100,
            atacker: enemy,
        };

        // Override random int function to always make the skill miss
        jest.spyOn(global.Math, 'random').mockReturnValue(skillProbability + 0.1);

        // Act
        fencer.defend(attack);

        // Assert
        expect(spyDefend).not.toHaveBeenCalled();

        // Reset mock
        jest.spyOn(global.Math, 'random').mockRestore();
    });
});
