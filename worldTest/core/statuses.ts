import type { Character } from '../../src';
import { StatusInstance } from '../../src/classes/StatusInstance';
import type { StatusDefinition } from '../../src/classes/StatusInstance';
import type { ImpactHitContext } from './damage/impact';

export function burnStatus(): StatusDefinition {
    return {
        name: 'Burn',
        polarity: 'negative',
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        onTrigger: (character) => {
            character.stats.hp = Math.max(0, character.stats.hp - 8);
            character.stats.isAlive = character.stats.hp > 0 ? 1 : 0;
        },
    };
}

export function poisonStatus(): StatusDefinition {
    return {
        name: 'Poison',
        polarity: 'negative',
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        onTrigger: (character) => {
            character.stats.hp = Math.max(0, character.stats.hp - 6);
            character.stats.isAlive = character.stats.hp > 0 ? 1 : 0;
        },
    };
}

export function regenStatus(): StatusDefinition {
    return {
        name: 'Regeneration',
        polarity: 'positive',
        applyOn: 'turn_end',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        onTrigger: (character) => {
            if (character.stats.hp <= 0) return;
            character.stats.hp = Math.min(character.stats.totalHp, character.stats.hp + 8);
        },
    };
}

/**
 * Bleeding: fixed 1 damage at the end of each turn (after_turn), for 3
 * turns. Reapplying Bleeding replaces the current instance with a fresh
 * one (StatusManager removes same-name statuses before adding), so the
 * duration restarts and the damage never stacks.
 */
export function bleedingStatus(): StatusDefinition {
    return {
        name: 'Bleeding',
        polarity: 'negative',
        description: 'Loses 1 hp at the end of each turn, for 3 turns.',
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        onTrigger: (character) => {
            if (character.stats.hp <= 0) return;
            character.stats.hp = Math.max(0, character.stats.hp - 1);
            character.stats.isAlive = character.stats.hp > 0 ? 1 : 0;
        },
    };
}

export function attackUpStatus(): StatusDefinition {
    return {
        name: 'Attack Up',
        polarity: 'positive',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'attack', to: 'attack', value: 10, typeOfModification: 'BUFF_FIXED' }],
    };
}

export function defenceUpStatus(): StatusDefinition {
    return {
        name: 'Defence Up',
        polarity: 'positive',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'defence', to: 'defence', value: 8, typeOfModification: 'BUFF_FIXED' }],
    };
}

export function weakenStatus(): StatusDefinition {
    return {
        name: 'Weaken',
        polarity: 'negative',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'attack', to: 'attack', value: 6, typeOfModification: 'DEBUFF_FIXED' }],
    };
}

export function hasteStatus(): StatusDefinition {
    return {
        name: 'Haste',
        polarity: 'positive',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'speed', to: 'speed', value: 8, typeOfModification: 'BUFF_FIXED' }],
    };
}

export function rageStatus(): StatusDefinition {
    return {
        name: 'Rage',
        polarity: 'positive',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'attack', to: 'attack', value: 20, typeOfModification: 'BUFF_PERCENTAGE' },
            { from: 'defence', to: 'defence', value: 20, typeOfModification: 'DEBUFF_PERCENTAGE' },
            { from: 'speed', to: 'speed', value: 4, typeOfModification: 'BUFF_FIXED' },
        ],
    };
}

/**
 * Faint: the character is out for 2 of its own turns (skip actions).
 * The fatigue system applies it at 100 fatigue and resets the value.
 */
export function faintStatus(): StatusDefinition {
    return {
        name: 'Faint',
        polarity: 'negative',
        description: 'Unconscious from exhaustion: loses 2 of their own turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 2 },
        turns: 2,
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
    };
}

/**
 * The lord's son's Gate affinity, awakened by the Open Gate skill: a
 * permanent status (lasts the whole fight) that unlocks Fire Breath,
 * grants +10 defence, and ramps up with every attack (+8 attack and +2
 * speed per stack, up to +40/+10). The stack counter lives on the
 * status itself (`stacks`) and the modifiers are rebuilt from it on
 * every re-apply.
 */
export function gateOpenedStatus(stacks = 0): StatusDefinition {
    const modifiers: StatusDefinition['statsAffected'] = [
        { from: 'defence', to: 'defence', value: 10, typeOfModification: 'BUFF_FIXED' },
        { from: 'attack', to: 'attack', value: 8 * stacks, typeOfModification: 'BUFF_FIXED' },
        { from: 'speed', to: 'speed', value: 2 * stacks, typeOfModification: 'BUFF_FIXED' },
    ];
    return {
        name: 'Gate Opened',
        polarity: 'positive',
        description:
            'The Gate is open: Fire Breath unlocked, defence +10, and every attack raises attack +8 and speed +2 (up to +40/+10).',
        applyOn: 'after_turn',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: modifiers.filter((modifier) => modifier.value > 0),
        grantsSkills: ['fire_breath'],
        stacks,
    };
}

/**
 * The boss goblin's berserk: stronger but reckless for 3 of its own
 * actions (on_turn, so the countdown follows its actions in tick
 * combat too).
 */
export function berserkStatus(): StatusDefinition {
    return {
        name: 'Berserk',
        polarity: 'positive',
        description: 'Attack +30%, defence -20% and speed +2 for 3 of its own actions.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'attack', to: 'attack', value: 30, typeOfModification: 'BUFF_PERCENTAGE' },
            { from: 'defence', to: 'defence', value: 20, typeOfModification: 'DEBUFF_PERCENTAGE' },
            { from: 'speed', to: 'speed', value: 2, typeOfModification: 'BUFF_FIXED' },
        ],
    };
}

// ---------------------------------------------------------------------------
// The Order Army skills. "N turns" statuses use the on_turn moment with
// duration N+1: they tick once per own action (before acting), so the
// bearer is affected for exactly N of its own actions in BOTH combat
// flows (turn-based and tick).
// ---------------------------------------------------------------------------

/**
 * Fast Draw (archers): speed +8 for 6 turns.
 */
export function fastDrawStatus(): StatusDefinition {
    return {
        name: 'Fast Draw',
        polarity: 'positive',
        description: 'Speed +8 for 6 turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 7 },
        turns: 6,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'speed', to: 'speed', value: 8, typeOfModification: 'BUFF_FIXED' }],
    };
}

/**
 * Perception (archers): +20 evasion and +3% crit chance for 5 turns.
 * The crit bonus is 3 points of the percent stat, not 3% of it.
 */
export function perceptionStatus(): StatusDefinition {
    return {
        name: 'Perception',
        polarity: 'positive',
        description: 'Evasion +20 and crit chance +3% for 5 turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 6 },
        turns: 5,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'evasion', to: 'evasion', value: 20, typeOfModification: 'BUFF_FIXED' },
            { from: 'critChance', to: 'critChance', value: 3, typeOfModification: 'BUFF_FIXED' },
        ],
    };
}

/**
 * Weak Point (archers): the enemy's attack -40% for 4 turns...
 */
export function weakPointAttackStatus(): StatusDefinition {
    return {
        name: 'Weak Point: Attack',
        polarity: 'negative',
        description: 'Attack -40% for 4 turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 5 },
        turns: 4,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'attack', to: 'attack', value: 40, typeOfModification: 'DEBUFF_PERCENTAGE' }],
    };
}

/**
 * ... and its defence -40% for 3 turns (the second status of the skill).
 */
export function weakPointDefenceStatus(): StatusDefinition {
    return {
        name: 'Weak Point: Defence',
        polarity: 'negative',
        description: 'Defence -40% for 3 turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 4 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'defence', to: 'defence', value: 40, typeOfModification: 'DEBUFF_PERCENTAGE' }],
    };
}

/**
 * Disarm (soldiers): the target loses grip and power: attack -5 fixed
 * and -20% for 5 turns. Applies to an enemy or an ally.
 */
export function disarmStatus(): StatusDefinition {
    return {
        name: 'Disarm',
        polarity: 'negative',
        description: 'Attack -5 and -20% for 5 turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 6 },
        turns: 5,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'attack', to: 'attack', value: 5, typeOfModification: 'DEBUFF_FIXED' },
            { from: 'attack', to: 'attack', value: 20, typeOfModification: 'DEBUFF_PERCENTAGE' },
        ],
    };
}

/**
 * Defence Stand (soldiers): braced stance: defence +10 and +20%,
 * magic defence +10 and +20% for 5 turns.
 */
export function defenceStandStatus(): StatusDefinition {
    return {
        name: 'Defence Stand',
        polarity: 'positive',
        description: 'Defence +10 and +20%, magic defence +10 and +20% for 5 turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 6 },
        turns: 5,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'defence', to: 'defence', value: 10, typeOfModification: 'BUFF_FIXED' },
            { from: 'defence', to: 'defence', value: 20, typeOfModification: 'BUFF_PERCENTAGE' },
            { from: 'magicDefence', to: 'magicDefence', value: 10, typeOfModification: 'BUFF_FIXED' },
            { from: 'magicDefence', to: 'magicDefence', value: 20, typeOfModification: 'BUFF_PERCENTAGE' },
        ],
    };
}

/**
 * Foot Shot (archers): the target limps and opens its guard: speed -3
 * and -30%, defence -2 and -30% for 2 turns.
 */
export function footShotStatus(): StatusDefinition {
    return {
        name: 'Foot Shot',
        polarity: 'negative',
        description: 'Speed -3 and -30%, defence -2 and -30% for 2 turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 2,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'speed', to: 'speed', value: 3, typeOfModification: 'DEBUFF_FIXED' },
            { from: 'speed', to: 'speed', value: 30, typeOfModification: 'DEBUFF_PERCENTAGE' },
            { from: 'defence', to: 'defence', value: 2, typeOfModification: 'DEBUFF_FIXED' },
            { from: 'defence', to: 'defence', value: 30, typeOfModification: 'DEBUFF_PERCENTAGE' },
        ],
    };
}

/**
 * Concentration (archers): the next shot is perfect: crit chance +40%
 * and crit multiplier +0.40. Consumed by the bearer's next BASIC attack
 * (skills do not run the impact pipeline, so they never consume it).
 */
export function concentrationStatus(): StatusDefinition {
    return {
        name: 'Concentration',
        polarity: 'positive',
        description: 'Crit chance +40% and crit multiplier +0.40; consumed on your next basic attack.',
        applyOn: 'impact_hit',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'critChance', to: 'critChance', value: 40, typeOfModification: 'BUFF_FIXED' },
            { from: 'critMultiplier', to: 'critMultiplier', value: 0.4, typeOfModification: 'BUFF_FIXED' },
        ],
        consumedOnImpactHit: true,
    };
}

/**
 * Impetu (soldiers): +10 fixed attack, +20% attack and +10 speed for 1
 * turn (the caster's next attack).
 */
export function impetuStatus(): StatusDefinition {
    return {
        name: 'Impetu',
        polarity: 'positive',
        description: 'Attack +10 and +20%, speed +10 for 1 turn.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 2 },
        turns: 1,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'attack', to: 'attack', value: 10, typeOfModification: 'BUFF_FIXED' },
            { from: 'attack', to: 'attack', value: 20, typeOfModification: 'BUFF_PERCENTAGE' },
            { from: 'speed', to: 'speed', value: 10, typeOfModification: 'BUFF_FIXED' },
        ],
    };
}

/**
 * Covered (the Cover skill): while the ally holds this status, the
 * given share of the next non-status hit it receives is redirected to
 * the coverer (through the coverer's own mitigation) and the status is
 * consumed. Re-covering the same ally replaces the instance, so only
 * the last Cover counts. Permanent: it lives until a hit consumes it or
 * the battle-end cleanup removes it.
 */
export function coveredStatus(coverer: Character, percent: number): StatusDefinition {
    return {
        name: 'Covered',
        polarity: 'positive',
        description: `${coverer.name} intercepts ${percent}% of the next hit taken.`,
        applyOn: 'after_turn',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        cover: { coverer, percent },
    };
}

/**
 * Corpse Carrying: the character hauls a fainted comrade to a place
 * that can revive them. Persistent: it survives the battle-end cleanup
 * (and Dispel ignores it) until the corpse is laid down at the
 * fountain. Heavy work: attack -50%, speed -60%, defence -40%.
 */
export function corpseCarryingStatus(): StatusDefinition {
    return {
        name: 'Corpse Carrying',
        polarity: 'negative',
        description: 'Carrying a fallen comrade: attack -50%, speed -60%, defence -40%.',
        applyOn: 'on_turn',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'attack', to: 'attack', value: 50, typeOfModification: 'DEBUFF_PERCENTAGE' },
            { from: 'speed', to: 'speed', value: 60, typeOfModification: 'DEBUFF_PERCENTAGE' },
            { from: 'defence', to: 'defence', value: 40, typeOfModification: 'DEBUFF_PERCENTAGE' },
        ],
        persistent: true,
    };
}

/**
 * The battle-end cleanup, in one function: removes every status, or —
 * with `keepPersistent` — only the battle-time ones (Corpse Carrying
 * travels with the character between fights). Replaces the raw
 * removeAllStatuses calls in the battle screens.
 */
export function clearStatuses(
    character: Character,
    options: { keepPersistent?: boolean } = {},
): void {
    for (const [id, status] of character.statusManager.statuses) {
        if (options.keepPersistent && status.definition.persistent) continue;
        character.statusManager.removeStatusInstance(id);
    }
}

/**
 * The farmer boss's Revolutionary Aura: while he lives, his whole team
 * (himself included) fights with +10 attack and +3 speed. The aura is
 * the status the boss carries; the combat engines sync its effect onto
 * every living teammate and drop it the moment he falls.
 */
export function revolutionaryAuraStatus(): StatusDefinition {
    return {
        name: 'Revolutionary Aura',
        polarity: 'positive',
        description: 'Team aura: +10 attack and +3 speed while the boss lives.',
        applyOn: 'after_turn',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        aura: { attack: 10, speed: 3 },
    };
}

/**
 * Removes every status of the given polarity from the character
 * (Dispel: positive from enemies, negative from allies). Persistent
 * statuses (Corpse Carrying) are not battle magic: Dispel skips them.
 */
export function removeStatusesByPolarity(
    character: import('../../src').Character,
    polarity: 'positive' | 'negative',
): string[] {
    const removed: string[] = [];
    for (const [id, status] of character.statusManager.statuses) {
        if (status.definition.persistent) continue;
        if (status.definition.polarity === polarity) {
            character.statusManager.removeStatusInstance(id);
            removed.push(status.definition.name);
        }
    }
    return removed;
}

/**
 * Sheen Ready: a one-shot charge consumed by the bearer's next impact
 * hit, which then deals +50% of the bearer's attack as extra physical
 * damage (its own component, so it reads as a second attack instance).
 */
export function sheenReadyStatus(): StatusDefinition {
    return {
        name: 'Sheen Ready',
        polarity: 'positive',
        description: 'Your next impact hit deals +50% of your attack as physical damage.',
        applyOn: 'impact_hit',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        consumedOnImpactHit: true,
        onImpactHit: (character, payload) => {
            const ctx = payload as ImpactHitContext;
            ctx.components.push({
                kind: 'physical',
                element: 'physical',
                amount: Math.round(character.getStat('attack') * 0.5 * 100) / 100,
                label: 'Sheen',
            });
        },
    };
}

/**
 * Phantom Strike: a one-shot charge consumed by the bearer's next
 * impact hit, which then applies 2 extra impact hits (each re-runs the
 * on-impact pipeline: item bonuses, statuses and counters).
 */
export function phantomStrikeStatus(): StatusDefinition {
    return {
        name: 'Phantom Strike',
        polarity: 'positive',
        description: 'Your next impact hit applies 2 extra impact hits.',
        applyOn: 'impact_hit',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        consumedOnImpactHit: true,
        onImpactHit: (character, payload) => {
            const ctx = payload as ImpactHitContext;
            ctx.impactHits += 2;
        },
    };
}

/**
 * Stun: the bearer loses its next action. Consumed by the combat
 * engines when the fighter's own turn arrives (consumeStunTurn): the
 * action is skipped and the status removed.
 */
export function stunStatus(): StatusDefinition {
    return {
        name: 'Stun',
        polarity: 'negative',
        description: 'Stunned: loses the next turn.',
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 1 },
        turns: 1,
        usageFrequency: 'ONCE',
        statsAffected: [],
    };
}

/** Consumes the bearer's Stun: true (and the status removed) when the
 *  fighter must lose this action. */
export function consumeStunTurn(character: Character): boolean {
    for (const status of character.statusManager.statuses.values()) {
        if (status.definition.name === 'Stun') {
            character.statusManager.removeStatusInstance(status.id);
            return true;
        }
    }
    return false;
}

/**
 * Blind: the bearer's accuracy drops by 45% while the status lasts.
 */
export function blindStatus(): StatusDefinition {
    return {
        name: 'Blind',
        polarity: 'negative',
        description: 'Accuracy −45% for 3 turns.',
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        turns: 3,
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'accuracy', to: 'accuracy', value: 45, typeOfModification: 'DEBUFF_PERCENTAGE' }],
    };
}

/**
 * Astra: while the bearer holds it, every negative status is refused.
 * The protection is a plain boolean on the character (raised on add,
 * lowered on remove) — applyStatus checks it, so the protection covers
 * every application path that goes through that helper.
 */
export function astraStatus(): StatusDefinition {
    return {
        name: 'Astra',
        polarity: 'positive',
        description: 'Protected from bad statuses.',
        applyOn: 'after_turn',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        onAdd: (character) => {
            character.blocksBadStatuses = true;
        },
        onRemove: (character) => {
            character.blocksBadStatuses = false;
        },
    };
}

/**
 * Adds a status to a character, honoring Astra: negative statuses are
 * refused while the character is protected. Returns whether it landed.
 */
export function applyStatus(character: Character, definition: StatusDefinition): boolean {
    if (definition.polarity === 'negative' && character.blocksBadStatuses) return false;
    character.statusManager.addStatusInstance(new StatusInstance({ definition }));
    return true;
}

/**
 * The human summary of a status's stat modifiers only: one entry per
 * stat change ('evasion +20', 'critChance +3%', 'attack −20%'), with
 * no name or description. Statuses without modifiers yield nothing.
 */
export function statusModifierSummary(definition: StatusDefinition): string[] {
    const parts: string[] = [];
    for (const modifier of definition.statsAffected) {
        const percentage =
            modifier.typeOfModification === 'BUFF_PERCENTAGE' ||
            modifier.typeOfModification === 'DEBUFF_PERCENTAGE';
        const sign =
            modifier.typeOfModification === 'DEBUFF_FIXED' ||
            modifier.typeOfModification === 'DEBUFF_PERCENTAGE' ?
                '-' :
                '+';
        // critChance is a percent-valued stat: a fixed +3 reads +3%.
        const showsPercent = percentage || modifier.to === 'critChance';
        parts.push(`${modifier.to} ${sign}${modifier.value}${showsPercent ? '%' : ''}`);
    }
    return parts;
}

/**
 * Human tooltip for a status: its description plus a summary of the
 * modifiers it carries (stat changes, final damage variation, granted
 * skills), so statuses without a hand-written description still explain
 * themselves.
 */
export function statusTooltip(definition: StatusDefinition): string {
    const parts: string[] = [];
    if (definition.description) parts.push(definition.description);

    parts.push(...statusModifierSummary(definition));

    if (definition.finalDamageVariation) {
        const percent = definition.finalDamageVariation.percent;
        parts.push(`damage taken ${percent >= 0 ? '+' : ''}${percent}%`);
    }
    if (definition.grantsSkills && definition.grantsSkills.length > 0) {
        parts.push(`unlocks ${definition.grantsSkills.join(', ')}`);
    }
    if (definition.cover) {
        parts.push(`${definition.cover.coverer.name} covers ${definition.cover.percent}%`);
    }

    return parts.join(' · ');
}
