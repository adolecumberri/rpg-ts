import { Character, Stats } from '../src';
import type { Statistics } from '../src';
import { HybridCombat } from '../worldTest/core/combat/hybridCombat';
import { hasStatusNamed, specOf } from '../worldTest/core/skills';

// ---------------------------------------------------------------------------
// Manual skill targeting: resolveManualSkill takes the player's pick for
// single-target skills, instead of the auto planner's preferred target.
// ---------------------------------------------------------------------------

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

function combatWithWeakPoint(): { combat: HybridCombat; weak: Character; strong: Character } {
    const archer = character('archer', { hp: 100, totalHp: 100, attack: 10, defence: 0 });
    const weak = character('weak', { hp: 100, totalHp: 100, attack: 10, defence: 0 });
    const strong = character('strong', { hp: 100, totalHp: 100, attack: 50, defence: 0 });
    const combat = new HybridCombat([
        { character: archer, interval: 1, side: 'left', manual: true, skills: [specOf('weak_point')!] },
        { character: weak, interval: 100, side: 'right' },
        { character: strong, interval: 100, side: 'right' },
    ], { random: () => 1 });
    return { combat, weak, strong };
}

describe('manual skill targeting', () => {
    it('casts a single-target skill on the player-picked enemy', () => {
        const { combat, weak, strong } = combatWithWeakPoint();

        const prompt = combat.next();
        expect(prompt.kind).toBe('manual');
        if (prompt.kind !== 'manual') return;

        // The player picks the weak enemy, not the auto-preferred one.
        const event = combat.resolveManualSkill('weak_point', 'weak');
        expect(event).not.toBeNull();
        expect(event!.skillId).toBe('weak_point');
        expect(event!.targetIds).toEqual(['weak']);
        expect(hasStatusNamed(weak, 'Weak Point: Attack')).toBe(true);
        expect(hasStatusNamed(strong, 'Weak Point: Attack')).toBe(false);
    });

    it('rejects a target that is not a living fighter', () => {
        const { combat } = combatWithWeakPoint();
        combat.next();
        expect(combat.resolveManualSkill('weak_point', 'missing')).toBeNull();
    });

    it('falls back to the auto planner without a player pick', () => {
        const { combat, weak, strong } = combatWithWeakPoint();
        combat.next();
        // The policy prefers the highest attack: the strong enemy.
        const event = combat.resolveManualSkill('weak_point');
        expect(event).not.toBeNull();
        expect(event!.targetIds).toEqual(['strong']);
        expect(hasStatusNamed(strong, 'Weak Point: Attack')).toBe(true);
        expect(hasStatusNamed(weak, 'Weak Point: Attack')).toBe(false);
    });
});
