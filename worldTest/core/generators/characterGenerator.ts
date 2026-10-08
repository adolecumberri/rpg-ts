import { Character, Experience, Stats } from '../../../src';
import { DEFAULT_ITEM_TABLE } from '../items';
import type { ItemRef } from '../constants/items';
import type { CreatureDefinition } from '../constants/creatures';
import { creatureProfile } from '../constants/creatures';
import type { Job } from '../jobs/Job';
import type { GrowthProfile, StatBlock } from '../config/growth';
import { DEFAULT_BASE, statBlockAtLevel } from '../config/growth';
import { applyJobBonuses, wireCharacterGrowth } from '../constants/jobs';
import { equipInto, firstFreeHole } from '../equipment/loadout';
import { XP } from '../xp/xpConfig';

/**
 * The character generator: builds a Character from a config object —
 * a creature constant, a job or a raw profile, a level, the equipment
 * references (Items constants) and explicit skills. The stats are a
 * pure function of the profile and the level; item bonuses stack on
 * top.
 *
 *   characterGenerator({ creature: Creatures.goblin, level: 1, hand: Items.stick })
 *   characterGenerator({ job: SOLDIER_JOB, level: 3, hand: Items.sword })
 */

export type CharacterGeneratorConfig = {
    // One of the three is required: the creature, the job or a raw
    // growth profile (a job also assigns the identity and bonuses).
    creature?: CreatureDefinition;
    job?: Job;
    profile?: GrowthProfile;
    level?: number;
    // Ids must be unique inside a battle; fights pass explicit ids.
    id?: string;
    name?: string;
    // Equipment references, resolved through the Items constants.
    hand?: ItemRef;
    offhand?: ItemRef;
    armor?: ItemRef;
    accessories?: ItemRef[];
    // Explicit per-character skill ids (overrides the job's defaults).
    skills?: string[];
    // The picture override: special characters keep their own profile
    // portrait (and battle sprite) instead of the held job's.
    portrait?: string;
    // Any stat overrides applied on top of the leveled profile.
    stats?: Partial<StatBlock>;
};

export function characterGenerator(config: CharacterGeneratorConfig): Character {
    if (!config.creature && !config.job && !config.profile) {
        throw new Error('characterGenerator needs a creature, a job or a profile.');
    }

    const level = config.level ?? 1;
    const profile: GrowthProfile = config.creature
        ? creatureProfile(config.creature)
        : config.job?.growth ?? config.profile ?? { base: DEFAULT_BASE };

    // A lone hp override sets both hp and totalHp (the old generator's
    // contract: the merged hp filled both fields).
    const overrides = { ...(config.stats ?? {}) };
    if (overrides.hp !== undefined && overrides.totalHp === undefined) {
        overrides.totalHp = overrides.hp;
    }

    const character = new Character({
        id: config.id ?? `${config.creature?.id ?? config.job?.id ?? 'character'}_${level}`,
        name: config.name ?? config.creature?.name ?? config.job?.title ?? 'Character',
        stats: new Stats({ ...statBlockAtLevel(profile, level), ...overrides }),
        experience: new Experience({ baseXpToLevel: XP.perLevel, xpGrowthFactor: 1 }),
    });

    // Growth and identity. The creation profile stays as the origin
    // (level-ups resolve the HELD job live, so job changes take effect
    // from the next level).
    character.growthProfile = profile;
    wireCharacterGrowth(character);
    if (config.creature) {
        character.speciesId = config.creature.id;
    }
    // The picture override: stamped once at creation, never re-derived.
    if (config.portrait) {
        character.portraitId = config.portrait;
    }
    if (config.job) {
        character.jobId = config.job.id;
        applyJobBonuses(character, config.job);
    }

    // Equipment: the five-hole loadout is the canonical home; items it
    // cannot hold (untyped weapons like the stick or the sickle) fall
    // back to the legacy manager, where combat still counts them.
    const equip = (ref?: ItemRef) => {
        if (!ref || !DEFAULT_ITEM_TABLE.has(ref.id)) return;
        const item = DEFAULT_ITEM_TABLE.createItem(ref.id);
        const result = equipInto(character, firstFreeHole(character), item);
        if (!result.ok && item.definition.slot) {
            character.equipment.equipOrReplace(item, character);
        }
    };
    equip(config.hand);
    equip(config.offhand);
    equip(config.armor);
    for (const accessory of config.accessories ?? []) {
        equip(accessory);
    }

    // Skills: the explicit kit travels with the character (no global
    // map mutation); skillIdsOf reads it first.
    if (config.skills && config.skills.length > 0) {
        character.skillIds = [...config.skills];
    }

    return character;
}
