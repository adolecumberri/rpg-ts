import { Character } from '../src/classes';
import { AttackResult } from '../src/types';

const spikeShield = (attackValue: number) => Math.floor( 7 + attackValue * 0.2);

const Defender = new Character({
    name: 'Defender',
    skillProbability: 1,
    className: 'Defender',
    statusManager: true,
    actionRecord: true,
    callbacks: {
        receiveDamage: ({ c, defence: { value, type, attacker } }) => {
            if (type === 'MISS') return;
            const damage = spikeShield(value);
            attacker.receiveDamage({
                type: 'SKILL',
                value: damage,
                attacker: c,
            });
        },
    },
});

describe('Defender Class', () => {
    let Defender: Character;
    let Attacker: Character;

    const spikeShield = (attack: AttackResult) => Math.floor(7 + attack.value * 0.2);

    beforeEach(() => {
        Attacker = new Character({
            name: 'Attacker',
            skillProbability: 1,
            className: 'Attacker',
            statusManager: true,
            actionRecord: true,
            stats: {
                attack: 10,
            },
        });

        Defender = new Character({
            name: 'Defender',
            skillProbability: 1,
            className: 'Defender',
            statusManager: true,
            actionRecord: true,
            callbacks: {
                receiveDamage: (attack: AttackResult) => {
                    if (attack.type === 'MISS') return;
                    const damage = spikeShield(attack);
                    attack.atacker?.receiveDamage({
                        type: 'SKILL',
                        value: damage,
                        attacker: Defender,
                    });
                },
            },
        });
    });

    test('Defender should reflect damage', () => {
        // Inicialmente, ambos personajes deberían tener HP completo.
        const initialHpAttacker = Attacker.stats.hp;
        const initialHpDefender = Defender.stats.hp;

        // Hacer que el atacante ataque al defensor con un ataque normal
        const attackResult = Attacker.attack();
        expect(attackResult.atacker?.id).toEqual(Attacker.id);

        const defendResult = Defender.defend(attackResult);
        Defender.receiveDamage(defendResult);

        // Calcular la cantidad de daño reflejada
        const expectedReflectedDamage = spikeShield(attackResult); // 7 + 10 * 0.20

        Attacker.receiveDamage({
            type: 'SKILL',
            value: expectedReflectedDamage,
            attacker: Defender,
        });
        // Comprueba si el HP del atacante ha disminuido correctamente.
        expect(Attacker.stats.hp).toEqual(0); // 1 - 9 = 0, porque es el minimo de vida.
        expect(Attacker.isAlive).toBe(false); // el personaje muere.

        // Comprueba si el HP del defensor ha disminuido correctamente.
        expect(Defender.stats.hp).toBeLessThan(initialHpDefender);
    });
});
