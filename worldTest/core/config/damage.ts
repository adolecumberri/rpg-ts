import { DEFAULT_STATS } from '../../../src/constants/stats.constants';
import type { Character } from '../../../src';
import type { ItemAttackContext, ItemHitContext } from '../damage/general';
import type { DamageComponent } from '../damage/composer';
import type { ReactionHandler } from '../damage/reactions';

// ---------------------------------------------------------------------------
// Interface enhancement (type level only).
//
// The library's Stats shape is an interface, so worldTest widens it
// through declaration merging instead of touching the library. The
// members are optional so the library's `Stats` class still satisfies
// the merged interface in every program that compiles it as source
// (this monorepo compiles the library sources directly).
// ---------------------------------------------------------------------------
declare module '@rpg' {
    interface Statistics {
        // Reduces magical damage the same way defence reduces physical.
        magicDefence?: number;
        // Percent chance (0-100) of a physical hit becoming a crit.
        critChance?: number;
        // Crits multiply the physical hit by this value (2 = double).
        critMultiplier?: number;
        // Turn order in turn-based combat and, through intervalFromSpeed,
        // attack frequency in the interval battle. Higher acts first.
        speed?: number;
        // Spell power: added to every magical damage component of the
        // bearer's basic attacks (the mage job raises it).
        magic?: number;
        // Attack reach. 'short' hits only the closest filled enemy row,
        // 'long' that row plus the next, 'all' every row.
        rangeOf?: 'short' | 'long' | 'all';
    }

    // The Stats class only declares the library fields; this merge makes
    // the worldTest stats visible on `character.stats` directly too, so
    // consumers use the enhanced Statistics instead of casting. The
    // runtime values always exist: DEFAULT_STATS is seeded below and the
    // Stats constructor copies them onto every instance.
    interface Stats<T extends Statistics = Statistics> {
        magicDefence?: number;
        critChance?: number;
        critMultiplier?: number;
        speed?: number;
        magic?: number;
        rangeOf?: 'short' | 'long' | 'all';
    }

    interface ItemDefinition {
        // worldTest extension: hook run by the general attack resolver
        // every time the bearer attacks. It may inspect the attacker's
        // and the defender's stats and return the (possibly modified)
        // damage component list.
        onAttack?: (context: ItemAttackContext) => DamageComponent[];
        // worldTest extension: hook run by the general attack resolver
        // after a hit lands with damage > 0. Perfect blocks/parries set
        // the damage to 0 and skip it entirely, so effects like Bleeding
        // only apply on real hits.
        onHit?: (context: ItemHitContext) => void;
        // The attack reach the weapon grants its bearer (overrides the
        // character's own rangeOf).
        rangeOf?: 'short' | 'long' | 'all';
        // The weapon triangle type (sword/bow/staff): jobs declare which
        // types they may wield.
        weaponType?: 'sword' | 'bow' | 'staff';
        // Bags add inventory slots to the party capacity.
        bagSlots?: number;
    }

    interface Character {
        // worldTest extension: reactive pieces that fire when the
        // character is attacked (Parry, Spike Shield...). Attached by
        // the systems that own them; the damage resolver only invokes.
        reactions?: ReactionHandler[];
        // worldTest extension: the species preset a generated character
        // was built from (set by the character generator). Content and
        // dev tools use it to reference the generic characters.
        speciesId?: string;
        // worldTest extension: the Job the character currently holds
        // (its stat bonuses and skill kit). Undefined = the default job
        // derived from the character id.
        jobId?: string;
    }
}

// Merging above only widens the types; the values must exist at runtime
// too. Seeding DEFAULT_STATS gives every character created through the
// library sane values for the enhanced stats, so `getStat` never
// resolves to NaN.
Object.assign(DEFAULT_STATS, {
    magicDefence: 0,
    critChance: 10,
    critMultiplier: 2,
    speed: 5,
    magic: 0,
    rangeOf: 'short',
});

// ---------------------------------------------------------------------------
// Status enhancement (type level only): a status may grant skills while
// it is active. The skill lists of the battles derive the granted
// skills from the bearer's live statuses, so the moment the status is
// removed (battle-end cleanup) the skills disappear too.
// ---------------------------------------------------------------------------
declare module '@rpg/classes/StatusInstance' {
    interface StatusDefinition {
        // Skill ids the bearer knows while this status is active.
        grantsSkills?: string[];
        // The status's internal counter (used by ramping statuses like
        // the Gate: each attack raises it and re-applies the modifiers).
        stacks?: number;
        // Good or bad: drives removal effects like the healer's Dispel
        // (positive = a buff, negative = a debuff/ailment).
        polarity?: 'positive' | 'negative';
        // The Cover skill: while the bearer holds this status, the
        // given share of the next non-status hit it receives is
        // redirected to the coverer. Consumed after one hit; the same
        // name guarantees only the last Cover is in effect.
        cover?: { coverer: Character; percent: number };
        // Persistent statuses survive the battle-end cleanup (Corpse
        // Carrying travels with the character between battles). Dispel
        // and the cleanup skip them.
        persistent?: boolean;
        // Team aura: while the holder lives, every member of its team
        // (the holder included) receives these fixed bonuses. The
        // holder's death ends the aura.
        aura?: { attack?: number; defence?: number; speed?: number; magic?: number };
        // Set on the internal effect statuses synced from an aura: the
        // aura's name, used to remove them when the holder dies.
        auraSource?: string;
    }
}

// ---------------------------------------------------------------------------
// Fixed values of the damage system.
// ---------------------------------------------------------------------------

export const DAMAGE_TYPES = {
    PHYSICAL: 'physical',
    MAGICAL: 'magical',
    // True damage ignores defence, resistances and affinities entirely:
    // 10 true damage deals 10.
    TRUE: 'true',
} as const;

export type DamageKind = typeof DAMAGE_TYPES[keyof typeof DAMAGE_TYPES];

// Element ids per kind. Ids match the worldTest element registry;
// `normal` physical damage keeps the historic 'physical' id and the
// magical `normal` element is the 'arcane' id.
export const PHYSICAL_ELEMENTS = {
    NORMAL: 'physical',
    PIERCE: 'pierce',
    BLUNT: 'blunt',
} as const;

export const MAGICAL_ELEMENTS = {
    NORMAL: 'arcane',
    FIRE: 'fire',
    ICE: 'ice',
} as const;

// Which kind each element deals. Elements outside these lists
// (lightning, poison...) default to magical.
export const ELEMENT_KINDS: Record<string, DamageKind> = {
    [PHYSICAL_ELEMENTS.NORMAL]: DAMAGE_TYPES.PHYSICAL,
    [PHYSICAL_ELEMENTS.PIERCE]: DAMAGE_TYPES.PHYSICAL,
    [PHYSICAL_ELEMENTS.BLUNT]: DAMAGE_TYPES.PHYSICAL,
    [MAGICAL_ELEMENTS.NORMAL]: DAMAGE_TYPES.MAGICAL,
    [MAGICAL_ELEMENTS.FIRE]: DAMAGE_TYPES.MAGICAL,
    [MAGICAL_ELEMENTS.ICE]: DAMAGE_TYPES.MAGICAL,
    [DAMAGE_TYPES.TRUE]: DAMAGE_TYPES.TRUE,
};

export function kindOfElement(element: string): DamageKind {
    return ELEMENT_KINDS[element] ?? DAMAGE_TYPES.MAGICAL;
}

export const CRIT_DEFAULTS = {
    // Crits multiply the component damage by this value.
    multiplier: 2,
    // Base crit chance percent. The actual roll reads the character's
    // critChance stat (seeded from this default).
    chancePercent: 10,
} as const;

export const MITIGATION = {
    // Multiplicative defence formula: incoming damage of a kind is
    // multiplied by constant / (constant + defence stat). 50 defence
    // halves the damage, and the planned level-100 cap of 80 defence
    // would reduce it to ~38%. Affinities apply on top, and true damage
    // skips the formula entirely.
    constant: 50,
} as const;
