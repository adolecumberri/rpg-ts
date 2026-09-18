import type { Character } from '../../../src';
import { XP } from './xpConfig';

export type XpGrant = {
    character: Character;
    gained: number;
    levels: number;
};

export type CombatXpOptions = {
    // The character that landed the killing blow.
    killer: Character;
    // The other alive party members (assists).
    allies: Character[];
    // Level of the defeated creature.
    creatureLevel: number;
    // When set, the killer receives exactly this amount and nobody else does.
    customXp?: number;
};

/**
 * Individual experience model:
 * - the killer gets XP.kill (or XP.overlevelKill when it is 5+ levels
 *   above the creature),
 * - every other alive ally gets XP.assist,
 * - customXp overrides everything: the killer receives exactly that.
 */
export function grantCombatXp(options: CombatXpOptions): XpGrant[] {
    const { killer, allies, creatureLevel, customXp } = options;
    const grants: XpGrant[] = [];

    if (customXp !== undefined) {
        grants.push({
            character: killer,
            gained: customXp,
            levels: killer.experience.gain(customXp),
        });
        return grants;
    }

    const overleveled = killer.experience.level >= creatureLevel + XP.overlevelGap;
    const killXp = overleveled ? XP.overlevelKill : XP.kill;
    grants.push({
        character: killer,
        gained: killXp,
        levels: killer.experience.gain(killXp),
    });

    for (const ally of allies) {
        if (ally.id === killer.id) continue;
        grants.push({
            character: ally,
            gained: XP.assist,
            levels: ally.experience.gain(XP.assist),
        });
    }

    return grants;
}
