import type { StatusDefinition } from '../../src/classes/StatusInstance';

export function burnStatus(): StatusDefinition {
    return {
        name: 'Burn',
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 3 },
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
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 3 },
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
        applyOn: 'turn_end',
        duration: { type: 'TEMPORAL', value: 3 },
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
        description: 'Loses 1 hp at the end of each turn, for 3 turns.',
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 3 },
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
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'attack', to: 'attack', value: 10, typeOfModification: 'BUFF_FIXED' }],
    };
}

export function defenceUpStatus(): StatusDefinition {
    return {
        name: 'Defence Up',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'defence', to: 'defence', value: 8, typeOfModification: 'BUFF_FIXED' }],
    };
}

export function weakenStatus(): StatusDefinition {
    return {
        name: 'Weaken',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'attack', to: 'attack', value: 6, typeOfModification: 'DEBUFF_FIXED' }],
    };
}

export function hasteStatus(): StatusDefinition {
    return {
        name: 'Haste',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [{ from: 'speed', to: 'speed', value: 8, typeOfModification: 'BUFF_FIXED' }],
    };
}

export function rageStatus(): StatusDefinition {
    return {
        name: 'Rage',
        applyOn: 'before_turn',
        duration: { type: 'TEMPORAL', value: 3 },
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
        description: 'Unconscious from exhaustion: loses 2 of their own turns.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 2 },
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
    };
}

/**
 * Defending (the Defend skill): takes 70% less damage for 1 turn.
 */
export function defendingStatus(): StatusDefinition {
    return {
        name: 'Defending',
        description: 'Braced for the blow: takes 70% less damage for 1 turn.',
        applyOn: 'after_turn',
        duration: { type: 'TEMPORAL', value: 1 },
        usageFrequency: 'PER_ACTION',
        statsAffected: [],
        // Final damage variation: takes 70% less from every hit.
        finalDamageVariation: { percent: -70 },
    };
}

/**
 * The lord's son's Gate affinity, awakened by the Open Gate skill: a
 * permanent status (lasts the whole fight) that unlocks Fire Breath.
 * The granted skill is derived from the live statuses, so removing the
 * status at battle end removes the skill too.
 */
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
        description: 'Attack +30%, defence -20% and speed +2 for 3 of its own actions.',
        applyOn: 'on_turn',
        duration: { type: 'TEMPORAL', value: 3 },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: [
            { from: 'attack', to: 'attack', value: 30, typeOfModification: 'BUFF_PERCENTAGE' },
            { from: 'defence', to: 'defence', value: 20, typeOfModification: 'DEBUFF_PERCENTAGE' },
            { from: 'speed', to: 'speed', value: 2, typeOfModification: 'BUFF_FIXED' },
        ],
    };
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

    for (const modifier of definition.statsAffected) {
        const percentage =
            modifier.typeOfModification === 'BUFF_PERCENTAGE' ||
            modifier.typeOfModification === 'DEBUFF_PERCENTAGE';
        const sign =
            modifier.typeOfModification === 'DEBUFF_FIXED' ||
            modifier.typeOfModification === 'DEBUFF_PERCENTAGE'
                ? '-'
                : '+';
        parts.push(`${modifier.to} ${sign}${modifier.value}${percentage ? '%' : ''}`);
    }

    if (definition.finalDamageVariation) {
        const percent = definition.finalDamageVariation.percent;
        parts.push(`damage taken ${percent >= 0 ? '+' : ''}${percent}%`);
    }
    if (definition.grantsSkills && definition.grantsSkills.length > 0) {
        parts.push(`unlocks ${definition.grantsSkills.join(', ')}`);
    }

    return parts.join(' · ');
}
