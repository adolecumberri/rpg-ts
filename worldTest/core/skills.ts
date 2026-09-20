import type { StatusDefinition } from '../../src/classes/StatusInstance';
import { attackUpStatus, burnStatus, defenceUpStatus, poisonStatus, regenStatus, weakenStatus } from './statuses';
import type { DamageComponent } from './damage/composer';

export type SkillTargeting = 'ENEMY' | 'ALL_ENEMIES' | 'ALL_ALLIES' | 'SELF';

/**
 * Feature-level skill specification. The web layer resolves these
 * specs through the compound damage composer and the status system.
 */
export type SkillSpec = {
    id: string;
    name: string;
    description: string;
    targeting: SkillTargeting;
    numberOfTargets?: number;
    // Priority tier (0 = normal): actions resolve by priority first and
    // speed second. No skill defines one yet, the field is ready for it.
    priority?: number;
    // Damage components resolved with the compound damage composer.
    damage?: DamageComponent[];
    // Flat heal applied to every target.
    heal?: number;
    statusOnTargets?: StatusDefinition;
    statusOnSelf?: StatusDefinition;
};

export const SKILLS: Record<string, SkillSpec> = {
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        description: 'Deals 40 fire damage to all enemies and burns for 8 per round over 3 rounds.',
        targeting: 'ALL_ENEMIES',
        damage: [{ element: 'fire', amount: 40, label: 'Fireball' }],
        statusOnTargets: burnStatus(),
    },
    regenerate: {
        id: 'regenerate',
        name: 'Regenerate',
        description: 'Applies Regeneration to the whole party: each member heals 8 HP at the end of their own turn for 3 turns.',
        targeting: 'ALL_ALLIES',
        statusOnTargets: regenStatus(),
    },
    warcry: {
        id: 'warcry',
        name: 'Warcry',
        description: 'Raises your attack and weakens one enemy for 3 rounds.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        statusOnSelf: attackUpStatus(),
        statusOnTargets: weakenStatus(),
    },
    poisonStrike: {
        id: 'poison_strike',
        name: 'Poison Strike',
        description: 'Strikes one enemy and poisons them for 3 rounds.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damage: [
            { element: 'physical', amount: 10, label: 'Strike' },
            { element: 'poison', amount: 6, label: 'Venom' },
        ],
        statusOnTargets: poisonStatus(),
    },
    chainBolt: {
        id: 'chain_bolt',
        name: 'Chain Bolt',
        description: 'Hits up to 4 enemies with lightning.',
        targeting: 'ENEMY',
        numberOfTargets: 4,
        damage: [{ element: 'lightning', amount: 15, label: 'Chain Bolt' }],
    },
    stoneSkin: {
        id: 'stone_skin',
        name: 'Stone Skin',
        description: 'Raises your defence for 3 turns.',
        targeting: 'SELF',
        statusOnSelf: defenceUpStatus(),
    },
    bladeDance: {
        id: 'blade_dance',
        name: 'Blade Dance',
        description: 'Slices up to 3 enemies.',
        targeting: 'ENEMY',
        numberOfTargets: 3,
        damage: [{ element: 'physical', amount: 16, label: 'Blade Dance' }],
    },
};

// Base skill ids available per character id (skill tree nodes add more).
export const CHARACTER_SKILLS: Record<string, string[]> = {
    hero: ['fireball', 'regenerate'],
    companion: ['poison_strike'],
};

export function skillIdsOf(characterId: string): string[] {
    return CHARACTER_SKILLS[characterId] ?? [];
}

export function specOf(skillId: string): SkillSpec | undefined {
    return SKILLS[skillId];
}
