import { Character, Stats } from '../src';
import type { Statistics } from '../src';
import { HybridCombat } from '../worldTest/core/combat/hybridCombat';

// ---------------------------------------------------------------------------
// The Pokémon-style stepping: resolveAction resolves exactly ONE fighter
// action per call (manual fighters pause for the player; automatic ones
// act alone), so the UI can walk the turn queue one action at a time.
// ---------------------------------------------------------------------------

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('the step API (one action at a time)', () => {
    it('resolves one fighter per call: manual pause, auto action, end', () => {
        const player = character('player', { hp: 100, totalHp: 100, attack: 10, defence: 0, speed: 8 });
        const goblin = character('goblin', { hp: 30, totalHp: 30, attack: 5, defence: 0, speed: 5 });
        const combat = new HybridCombat([
            { character: player, interval: 1, side: 'left', manual: true },
            { character: goblin, interval: 1, side: 'right' },
        ], { random: () => 1 });

        expect(combat.isOver()).toBeNull();

        // The player's step pauses for a manual answer.
        const prompt = combat.resolveAction('player');
        expect(prompt?.kind).toBe('manual');
        if (prompt?.kind !== 'manual') return;
        expect(combat.hasPendingManual()).toBe(true);
        const hit = combat.resolveManual(prompt.targets[0]);
        expect(hit?.kind).toBe('auto');
        expect(hit?.targetId).toBe('goblin');
        expect(combat.hasPendingManual()).toBe(false);
        expect(combat.isOver()).toBeNull(); // 30 - 10: the goblin survives

        // The goblin's step resolves its automatic action alone.
        const counter = combat.resolveAction('goblin');
        expect(counter?.kind).toBe('auto');
        expect(counter?.actorId).toBe('goblin');
        expect(combat.isOver()).toBeNull();

        // Dead fighters are skipped and the winner is exposed.
        goblin.stats.hp = 0;
        goblin.stats.isAlive = 0;
        expect(combat.resolveAction('goblin')).toBeNull();
        expect(combat.isOver()).toBe('left');
    });

    it('regenerates mana at the start of each of the fighter\'s own steps', () => {
        const player = character('player', { hp: 100, totalHp: 100, attack: 10, defence: 0, speed: 8 });
        const goblin = character('goblin', { hp: 1000, totalHp: 1000, attack: 0, defence: 0, speed: 5 });
        const combat = new HybridCombat([
            { character: player, interval: 1, side: 'left', manual: true },
            { character: goblin, interval: 1, side: 'right' },
        ], { random: () => 1 });

        // 20 opening + 4 regen at the first step.
        const prompt = combat.resolveAction('player');
        if (prompt?.kind !== 'manual') throw new Error('expected a manual prompt');
        expect(player.stats.mana).toBe(24);
    });

    it('skips fainted fighters instead of resolving their action', () => {
        const player = character('player', { hp: 100, totalHp: 100, attack: 10, defence: 0, speed: 8 });
        const goblin = character('goblin', { hp: 1000, totalHp: 1000, attack: 0, defence: 0, speed: 5 });
        const combat = new HybridCombat([
            { character: player, interval: 1, side: 'left', manual: true },
            { character: goblin, interval: 1, side: 'right' },
        ], { random: () => 1 });

        expect(combat.resolveAction('missing')).toBeNull();
        player.stats.hp = 0;
        player.stats.isAlive = 0;
        expect(combat.resolveAction('player')).toBeNull();
    });
});
