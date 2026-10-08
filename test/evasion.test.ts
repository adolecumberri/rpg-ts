import { Character, Stats } from '../src';
import { resolveGeneralAttack } from '../worldTest/core/damage/general';
import { resolveBasicAttack } from '../worldTest/core/damage/character';
import { assignReactiveSkills } from '../worldTest/core/skills';

function fighter(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('accuracy and evasion', () => {
    it('a defender with evasion dodges a perfectly accurate attack', () => {
        const attacker = fighter('attacker', { attack: 10, hp: 100, totalHp: 100, defence: 0 });
        const defender = fighter('defender', { hp: 100, totalHp: 100, defence: 0, evasion: 40 });

        // roll 0: below 40, the hit is evaded.
        const evaded = resolveGeneralAttack(attacker, defender, () => 0);
        expect(evaded.damage).toBe(0);
        expect(evaded.note).toBe('evaded');

        // roll 100: not below 40, the hit lands.
        const landed = resolveGeneralAttack(attacker, defender, () => 1);
        expect(landed.damage).toBe(10);
        expect(landed.note).toBeUndefined();
    });

    it('accuracy still misses before evasion is even rolled', () => {
        const attacker = fighter('attacker', { attack: 10, accuracy: 50 });
        const defender = fighter('defender', { defence: 0, evasion: 0 });

        // roll 90 >= 50: the attack misses (no evasion roll needed).
        const missed = resolveGeneralAttack(attacker, defender, () => 0.9);
        expect(missed.damage).toBe(0);
        expect(missed.note).toBe('missed');
    });

    it('counter-attacks ignore the attacker\'s evasion', () => {
        const attacker = fighter('attacker', {
            attack: 10,
            hp: 100,
            totalHp: 100,
            defence: 0,
            evasion: 100,
        });
        const defender = fighter('defender', { hp: 100, totalHp: 100, defence: 0 });
        assignReactiveSkills(defender, ['spike_shield']);

        const result = resolveBasicAttack(attacker, defender, { random: () => 1 });

        // The hit lands (the defender has no evasion) and the spike
        // counter lands despite the attacker's 100 evasion.
        expect(result.total).toBe(10);
        expect(attacker.stats.hp).toBe(90); // 10 + 0 defence spike counter
    });
});
