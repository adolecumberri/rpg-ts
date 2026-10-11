import { Character, Stats } from '../src';
import type { Statistics } from '../src';
import { HybridCombat } from '../worldTest/core/combat/hybridCombat';
import { skillEffectSummary, specOf } from '../worldTest/core/skills';
import { perceptionStatus } from '../worldTest/core/statuses';

// ---------------------------------------------------------------------------
// Perception (the archer skill): 12 mana, +20 evasion and +3% crit for 2
// turns, hidden from the menus while the caster cannot afford it.
// ---------------------------------------------------------------------------

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

function combatWithPerception(archer: Character): HybridCombat {
    const dummy = character('dummy', { hp: 1000, totalHp: 1000, attack: 0, defence: 0 });
    return new HybridCombat([
        { character: archer, interval: 1, side: 'left', manual: true, skills: [specOf('perception')!] },
        { character: dummy, interval: 100, side: 'right' },
    ], { random: () => 1 });
}

describe('perception', () => {
    it('is a self skill costing 12 mana', () => {
        const spec = specOf('perception')!;
        expect(spec.name).toBe('Perception');
        expect(spec.targeting).toBe('SELF');
        expect(spec.manaCost).toBe(12);
    });

    it('applies the Perception status: +20 evasion and +3% crit for 2 turns', () => {
        const status = perceptionStatus();
        expect(status.name).toBe('Perception');
        expect(status.polarity).toBe('positive');
        expect(status.duration).toEqual({ type: 'TEMPORAL', value: 3 }); // 2 own actions
        expect(status.statsAffected).toEqual([
            { from: 'evasion', to: 'evasion', value: 20, typeOfModification: 'BUFF_FIXED' },
            { from: 'critChance', to: 'critChance', value: 3, typeOfModification: 'BUFF_FIXED' },
        ]);
    });

    it('casting spends 12 mana and raises evasion and crit chance', () => {
        const archer = character('archer', {
            hp: 100, totalHp: 100, attack: 10, defence: 0, evasion: 20, critChance: 10,
        });
        const combat = combatWithPerception(archer);

        const prompt = combat.next();
        expect(prompt.kind).toBe('manual');
        if (prompt.kind !== 'manual') return;
        expect(prompt.skills).toEqual(['perception']);

        const event = combat.resolveManualSkill('perception');
        expect(event).not.toBeNull();
        expect(event!.skillId).toBe('perception');
        expect(archer.stats.mana).toBe(12); // 20 opening + 4 turn regen - 12 cost
        expect(archer.getStat('evasion')).toBe(40);
        expect(archer.getStat('critChance')).toBe(13);
    });

    it('summarizes only the stat changes for the tooltip', () => {
        // No name, no description: the cell label already says
        // "Perception" — the tooltip carries the numbers only.
        expect(skillEffectSummary(specOf('perception')!)).toBe('evasion +20 · critChance +3%');
    });

    it('offers the skill in the prompt but refuses the cast while unaffordable', () => {
        const archer = character('archer', { hp: 100, totalHp: 100, attack: 10, defence: 0 });
        const combat = combatWithPerception(archer);
        // 7 + the 4 turn-start regen = 11 < 12: unaffordable.
        archer.stats.mana = 7;

        const prompt = combat.next();
        expect(prompt.kind).toBe('manual');
        if (prompt.kind !== 'manual') return;
        // Listed (the UI disables it) — never hidden from the menu.
        expect(prompt.skills).toEqual(['perception']);
        // The engine refuses the cast anyway: no mana spent, the prompt
        // stays pending so the player can still attack.
        expect(combat.resolveManualSkill('perception')).toBeNull();
        expect(archer.stats.mana).toBe(11);
    });

    it('the refused skill becomes castable once the fighter regenerates', () => {
        const archer = character('archer', { hp: 100, totalHp: 100, attack: 10, defence: 0 });
        const combat = combatWithPerception(archer);
        archer.stats.mana = 7;

        let prompt = combat.next();
        if (prompt.kind !== 'manual') throw new Error('expected a manual prompt');
        expect(combat.resolveManualSkill('perception')).toBeNull();
        // The basic attack spends the turn (mana 11); by the next turn
        // start the regen brings it to 15 ≥ 12: the cast succeeds.
        combat.resolveManual('dummy');
        prompt = combat.next();
        while (prompt.kind === 'auto') prompt = combat.next();
        expect(prompt.kind).toBe('manual');
        if (prompt.kind !== 'manual') return;
        expect(prompt.skills).toEqual(['perception']);
        const event = combat.resolveManualSkill('perception');
        expect(event).not.toBeNull();
        expect(event!.skillId).toBe('perception');
        expect(archer.stats.mana).toBe(3); // 15 - 12
    });
});
