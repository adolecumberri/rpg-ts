import type { Character } from '../../../src';
import { StatusInstance } from '../../../src/classes/StatusInstance';
import type { StatusDefinition } from '../../../src/classes/StatusInstance';

// ---------------------------------------------------------------------------
// Team auras: a status the HOLDER carries that grants fixed bonuses to
// every member of its team (the holder included) while the holder
// lives. The engines call syncAuras after every action, so the effect
// appears at battle start and disappears the moment the holder dies.
// ---------------------------------------------------------------------------

export const AURA_EFFECT_PREFIX = 'Aura: ';

export function auraEffectNameOf(auraName: string): string {
    return AURA_EFFECT_PREFIX + auraName;
}

/** The internal effect status a team member receives from an aura. */
export function auraEffectStatus(
    auraName: string,
    bonuses: NonNullable<StatusDefinition['aura']>,
): StatusDefinition {
    const statsAffected: StatusDefinition['statsAffected'] = [];
    const fixed = (stat: 'attack' | 'defence' | 'speed' | 'magic', value: number | undefined) => {
        if (value === undefined) return;
        statsAffected.push({ from: stat, to: stat, value, typeOfModification: 'BUFF_FIXED' });
    };
    fixed('attack', bonuses.attack);
    fixed('defence', bonuses.defence);
    fixed('speed', bonuses.speed);
    fixed('magic', bonuses.magic);

    return {
        name: auraEffectNameOf(auraName),
        polarity: 'positive',
        description: `Team aura: ${auraName}.`,
        applyOn: 'after_turn',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected,
        auraSource: auraName,
    };
}

function hasStatusNamed(character: Character, name: string): boolean {
    for (const status of character.statusManager.statuses.values()) {
        if (status.definition.name === name) return true;
    }
    return false;
}

/**
 * Synchronizes the aura effects across one team: every living member
 * receives an effect status per living aura holder (distinct by aura
 * name), and effects whose holder died are removed. Idempotent and
 * cheap: call it after each action of the battle.
 */
export function syncAuras(team: Character[]): void {
    // Living holders, one bonuses map per aura name.
    const bonusesByAura = new Map<string, NonNullable<StatusDefinition['aura']>>();
    for (const character of team) {
        if (character.stats.hp <= 0) continue;
        for (const status of character.statusManager.statuses.values()) {
            if (!status.definition.aura) continue;
            const name = status.definition.name;
            if (!bonusesByAura.has(name)) bonusesByAura.set(name, status.definition.aura);
        }
    }

    for (const character of team) {
        if (character.stats.hp <= 0) continue;

        // Effects whose source aura is gone (the holder died).
        for (const [id, status] of character.statusManager.statuses) {
            const source = status.definition.auraSource;
            if (source !== undefined && !bonusesByAura.has(source)) {
                character.statusManager.removeStatusInstance(id);
            }
        }

        // Missing effects: one per aura name (idempotent).
        for (const [name, bonuses] of bonusesByAura) {
            const effectName = auraEffectNameOf(name);
            if (hasStatusNamed(character, effectName)) continue;
            character.statusManager.addStatusInstance(
                new StatusInstance({ definition: auraEffectStatus(name, bonuses) }),
            );
        }
    }
}
