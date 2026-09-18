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
