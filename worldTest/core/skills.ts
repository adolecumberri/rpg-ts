import type { Character } from '../../src';
import type { StatusDefinition } from '../../src/classes/StatusInstance';
import {
    hasteStatus,
    rageStatus,
    defendingStatus,
    gateOpenedStatus,
    berserkStatus,
    fastDrawStatus,
    weakPointAttackStatus,
    weakPointDefenceStatus,
    impetuStatus,
} from './statuses';
import { FATIGUE } from './combat/fatigue';
import { heldJobOf } from './constants/jobs';
import type { DamageComponent } from './damage/composer';
import type { ConditionInput } from './combat/conditions';
import { addReaction, removeReaction } from './damage/reactions';
import type { ReactionHandler } from './damage/reactions';

export type SkillTargeting = 'ENEMY' | 'ALLY' | 'ALL_ENEMIES' | 'ALL_ALLIES' | 'SELF' | 'ANY';

// A reactive skill: it fires when the bearer is attacked instead of
// being chosen as an action.
export type ReactionSpec = {
    // Percent chance (0-100) the reaction triggers on being attacked.
    chance?: number;
    // Fraction of the incoming damage reflected back at the attacker.
    reflectPercent?: number;
    // When true the defender takes no damage (parry); the attacker takes
    // reflectPercent of the would-be damage instead.
    negate?: boolean;
    // When true the reflected damage bypasses all mitigation (true damage).
    trueDamage?: boolean;
};

// Who the planner prefers when a support skill needs targets.
export type AutoTargetPreference =
    | 'lowest_hp'
    | 'most_negative_statuses'
    | 'highest_attack';

/**
 * Automatic use policy for the auto battles (interval/hybrid engines).
 * Eligible skills roll independently in catalog order: the first one
 * whose conditions pass, cooldown is ready and chance roll succeeds
 * wins; otherwise the fighter does a basic attack. No policy = the
 * skill is never used automatically.
 */
export type AutoUsePolicy = {
    // Percent chance (0-100) per eligible action. Default 100.
    chancePercent?: number;
    // Patience: the chance grows by this many points per action the
    // conditions held while the roll failed, so sustained problems are
    // eventually answered without early spam. Resets when the
    // conditions stop holding or the skill fires.
    chanceRampPerAction?: number;
    // Ceiling of the ramped chance (default 100).
    maxChance?: number;
    // How many of the fighter's subsequent actions the skill stays
    // locked after a use. Default 0 (usable every action).
    cooldownActions?: number;
    // The lock is shared across the fighter's whole side: only one
    // member may cast this skill per window (decays once per side
    // action). Two healers never both Dispel the same turn.
    sharedCooldown?: boolean;
    // Eligibility conditions. Default: no conditions (always eligible).
    conditions?: ConditionInput[];
    // 'all': every condition must hold (default). 'any': one is enough.
    conditionMatch?: 'all' | 'any';
    // Who the planner prefers when the skill needs targets (Dispel ->
    // most debuffed ally, Cure -> lowest hp, Weak Point -> strongest
    // enemy). Without it the historic taunt-weighted pick applies.
    target?: { side: 'ally' | 'enemy'; prefer: AutoTargetPreference };
};

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
    // Attack reach of the skill. Spells default to 'all' (every row).
    rangeOf?: 'short' | 'long' | 'all';
    // Damage components resolved with the compound damage composer.
    damage?: DamageComponent[];
    // Dynamic damage: computed from the actor at resolution time
    // (e.g. 20 + 30% of attack). Replaces `damage` when present.
    damageFor?: (actor: Character) => DamageComponent[];
    // Flat heal applied to every target.
    heal?: number;
    // Dynamic heal: computed per target at resolution time (Cure:
    // 60% of the target's hp, capped). Replaces `heal` when present.
    healFor?: (actor: Character, target: Character) => number;
    statusOnTargets?: StatusDefinition;
    // Several statuses on the targets at once (Weak Point applies two
    // debuffs with different durations).
    statusesOnTargets?: StatusDefinition[];
    statusOnSelf?: StatusDefinition;
    // Status removal, resolved by the target's side: Dispel removes
    // positive statuses from enemies and negative ones from allies.
    dispel?: {
        onEnemy?: 'positive' | 'negative' | 'all';
        onAlly?: 'positive' | 'negative' | 'all';
    };
    // Cover: the target ally is protected by the caster — the given
    // share of the next non-status hit it receives is redirected to
    // the caster. Targets a single ally.
    cover?: { percent: number };
    // Fatigue change applied to the caster on use (negative restores,
    // e.g. Rest: -20, Defend: -10).
    fatigueDelta?: number;
    // When the bearer has a status with this NAME, the skill is hidden
    // from the menus (activation skills like Open Gate disappear once
    // the affinity they awaken is already active).
    hideWhenStatus?: string;
    // Reactive behavior when the bearer is attacked (autofights).
    reaction?: ReactionSpec;
    // Automatic use policy in the auto battles.
    auto?: AutoUsePolicy;
};

// General skills for autofights (not assigned to any character yet).
export const SKILLS: Record<string, SkillSpec> = {
    spikeShield: {
        id: 'spike_shield',
        name: 'Spike Shield',
        description: 'Returns 18% of the damage taken as true damage to the attacker.',
        targeting: 'SELF',
        reaction: { chance: 100, reflectPercent: 0.18, trueDamage: true },
    },
    parry: {
        id: 'parry',
        name: 'Parry',
        description: 'Negates the incoming attack and returns 70% of its damage to the attacker.',
        targeting: 'SELF',
        reaction: { chance: 100, reflectPercent: 0.7, negate: true },
    },
    haste: {
        id: 'haste',
        name: 'Haste',
        description: 'Raises speed by 8 for 3 turns.',
        targeting: 'SELF',
        statusOnSelf: hasteStatus(),
    },
    rage: {
        id: 'rage',
        name: 'Rage',
        description: 'Attack +20%, defence −20% and speed +4 for 3 turns.',
        targeting: 'SELF',
        statusOnSelf: rageStatus(),
    },
    fireBreath: {
        id: 'fire_breath',
        name: 'Fire Breath',
        description: 'Deals 20 + 30% of your attack as magical fire damage to every enemy.',
        targeting: 'ALL_ENEMIES',
        damageFor: (actor) => [{
            kind: 'magical',
            element: 'fire',
            amount: Math.round((20 + actor.getStat('attack') * 0.3) * 100) / 100,
            label: 'Fire Breath',
        }],
    },
    defend: {
        id: 'defend',
        name: 'Defend',
        description: 'Takes 70% less damage for 1 turn and restores 10 fatigue.',
        targeting: 'SELF',
        statusOnSelf: defendingStatus(),
        fatigueDelta: -10,
    },
    rest: {
        id: 'rest',
        name: 'Rest',
        description: 'Recovers 20 fatigue.',
        targeting: 'SELF',
        fatigueDelta: -20,
    },
    openGate: {
        id: 'open_gate',
        name: 'Open Gate',
        description: 'Awakens the Gate affinity: unlocks Fire Breath for the rest of the fight.',
        targeting: 'SELF',
        statusOnSelf: gateOpenedStatus(),
        hideWhenStatus: 'Gate Opened',
    },
    bossRegen: {
        id: 'boss_regen',
        name: 'Regeneration',
        description: 'The chief closes its wounds: heals 25 hp.',
        targeting: 'SELF',
        heal: 25,
        auto: {
            chancePercent: 100,
            cooldownActions: 4,
            conditions: [{ subject: 'self', stat: 'hp', compare: 'below', value: 50, valueType: 'percent' }],
        },
    },
    bossBerserk: {
        id: 'boss_berserk',
        name: 'Berserk',
        description: 'The chief flies into a rage: stronger but reckless for 3 actions.',
        targeting: 'SELF',
        statusOnSelf: berserkStatus(),
        auto: { chancePercent: 100, cooldownActions: 5 },
    },
    fastDraw: {
        id: 'fast_draw',
        name: 'Fast Draw',
        description: 'Speed +8 for 3 turns.',
        targeting: 'SELF',
        statusOnSelf: fastDrawStatus(),
    },
    weakPoint: {
        id: 'weak_point',
        name: 'Weak Point',
        description: 'The enemy\'s attack -40% for 2 turns and defence -40% for 1 turn.',
        targeting: 'ENEMY',
        statusesOnTargets: [weakPointAttackStatus(), weakPointDefenceStatus()],
        // The archer exploits enemies that are still at full strength:
        // not a single enemy carries a debuff yet (any + negate).
        auto: {
            conditions: [{
                subject: 'enemy',
                match: 'any',
                negate: true,
                hasStatus: { polarity: 'negative' },
            }],
            chancePercent: 45,
            chanceRampPerAction: 10,
            maxChance: 90,
            cooldownActions: 3,
            target: { side: 'enemy', prefer: 'highest_attack' },
        },
    },
    dispel: {
        id: 'dispel',
        name: 'Dispel',
        description: 'Removes positive statuses from enemies and negative statuses from allies. Pick 1 or 2 targets.',
        targeting: 'ANY',
        numberOfTargets: 2,
        dispel: { onEnemy: 'positive', onAlly: 'negative' },
        // The healer answers trouble: any ally carrying a debuff makes
        // Dispel eligible, with growing insistence while it lingers.
        auto: {
            conditions: [{
                subject: 'ally',
                match: 'any',
                hasStatus: { polarity: 'negative' },
            }],
            chancePercent: 60,
            chanceRampPerAction: 15,
            maxChance: 100,
            cooldownActions: 2,
            sharedCooldown: true,
            target: { side: 'ally', prefer: 'most_negative_statuses' },
        },
    },
    cure: {
        id: 'cure',
        name: 'Cure',
        description: 'Heals 60% of the target\'s hp, capped at 40 hp.',
        targeting: 'ANY',
        numberOfTargets: 1,
        healFor: (actor, target) =>
            Math.min(40, Math.round(target.getStat('totalHp') * 0.6 * 100) / 100),
    },
    impetu: {
        id: 'impetu',
        name: 'Impetu',
        description: 'Attack +10 and +20%, speed +10 for 1 turn.',
        targeting: 'SELF',
        statusOnSelf: impetuStatus(),
    },
    firstAid: {
        id: 'first_aid',
        name: 'First Aid',
        description: 'Heals a target for 40% of the user\'s attack.',
        targeting: 'ANY',
        numberOfTargets: 1,
        healFor: (actor) => Math.round(actor.getStat('attack') * 0.4 * 100) / 100,
    },
    cover: {
        id: 'cover',
        name: 'Cover',
        description:
            'Protects an ally: the caster intercepts 60% of the next hit the ally receives, through the caster\'s own defence.',
        targeting: 'ALLY',
        numberOfTargets: 1,
        cover: { percent: 60 },
    },
};

// Skills every character knows by default (the fatigue management kit).
export const DEFAULT_SKILLS: string[] = ['defend', 'rest'];

/**
 * The default kit actually offered to a character. While the fatigue
 * system is switched off, Rest (a pure fatigue skill) is hidden.
 */
export function defaultSkillIds(): string[] {
    return FATIGUE.enabled ? DEFAULT_SKILLS : ['defend'];
}

// Base skill ids available per character id: the job of the character
// provides the recruit kits; extra entries live here.
export const CHARACTER_SKILLS: Record<string, string[]> = {
    // The lord's son awakens his Gate affinity first: Fire Breath comes
    // from the awakened status, not from the base kit.
    lord_son: ['open_gate'],
    // The goblin chief heals when wounded and rages every few actions.
    hay_boss_goblin: ['boss_regen', 'boss_berserk'],
};

export function skillIdsOf(character: Character): string[] {
    return CHARACTER_SKILLS[character.id] ?? heldJobOf(character)?.skillIds ?? [];
}

/** Whether the character carries a status with the given name. */
export function hasStatusNamed(character: Character, name: string): boolean {
    for (const status of character.statusManager.statuses.values()) {
        if (status.definition.name === name) return true;
    }
    return false;
}

/**
 * Skill ids granted by the character's live statuses (Open Gate grants
 * Fire Breath while the Gate Opened status is active). Because the list
 * is derived, the skills disappear the moment the status is removed —
 * the battle-end cleanup is the removal trigger.
 */
export function grantedSkillIds(character: Character): string[] {
    const granted: string[] = [];
    for (const status of character.statusManager.statuses.values()) {
        for (const skillId of status.definition.grantsSkills ?? []) {
            if (granted.indexOf(skillId) === -1) granted.push(skillId);
        }
    }
    return granted;
}

/**
 * The full skill spec list a battle shows for a character: the given
 * base specs plus the skills granted by live statuses, hiding
 * activation skills whose status is already active.
 */
export function battleSkillSpecs(character: Character, base: SkillSpec[]): SkillSpec[] {
    const specs: SkillSpec[] = [];
    const add = (spec: SkillSpec | undefined) => {
        if (!spec) return;
        if (specs.some((entry) => entry.id === spec.id)) return;
        if (spec.hideWhenStatus && hasStatusNamed(character, spec.hideWhenStatus)) return;
        specs.push(spec);
    };
    for (const spec of base) add(spec);
    for (const skillId of grantedSkillIds(character)) add(specOf(skillId));
    return specs;
}

export function specOf(skillId: string): SkillSpec | undefined {
    return allSkillSpecs().find((spec) => spec.id === skillId);
}

/**
 * Every skill defined in the catalog, in definition order. The skill
 * catalog view consumes this.
 */
export function allSkillSpecs(): SkillSpec[] {
    return Object.values(SKILLS);
}

// ---------------------------------------------------------------------------
// Reactive skill wiring: a skill spec is a piece of data; when a config (or
// a mission) grants the skill to a character, this converts the spec into
// the reactive piece the character carries. The damage resolver knows
// nothing about skills.
//
// The skills module tracks which pieces it attached, so removing a skill
// removes exactly its own piece and never touches pieces from other
// systems.
// ---------------------------------------------------------------------------
export function reactionHandlerFromSpec(spec: SkillSpec): ReactionHandler | undefined {
    const reaction = spec.reaction;
    if (!reaction) return undefined;

    return ({ incomingDamage, random }) => {
        // A 100% chance always triggers; anything below rolls the RNG.
        if (reaction.chance !== undefined && reaction.chance < 100 && random() * 100 >= reaction.chance) {
            return null;
        }

        const reflect = Math.round(incomingDamage * (reaction.reflectPercent ?? 0) * 100) / 100;
        if (reaction.negate) {
            return { damage: 0, reflect, note: 'parried!' };
        }
        return { damage: incomingDamage, reflect, note: reaction.trueDamage ? 'spiked true' : 'spiked' };
    };
}

// Per character: the skill id -> piece attached by this module.
const attachedSkills = new WeakMap<Character, Map<string, ReactionHandler>>();

function attachmentsOf(character: Character): Map<string, ReactionHandler> {
    let map = attachedSkills.get(character);
    if (!map) {
        map = new Map();
        attachedSkills.set(character, map);
    }
    return map;
}

/**
 * Grants one reactive skill to a character. Idempotent: granting the
 * same skill twice attaches a single piece.
 */
export function assignReactiveSkill(character: Character, skillId: string): boolean {
    const attachments = attachmentsOf(character);
    if (attachments.has(skillId)) return true;

    const spec = specOf(skillId);
    const handler = spec ? reactionHandlerFromSpec(spec) : undefined;
    if (!handler) return false;

    addReaction(character, handler);
    attachments.set(skillId, handler);
    return true;
}

/**
 * Grants several reactive skills at once (adds without clearing).
 */
export function assignReactiveSkills(character: Character, skillIds: string[]): void {
    for (const id of skillIds) assignReactiveSkill(character, id);
}

/**
 * Removes a reactive skill from a character: only this module's piece
 * for that skill is removed, everything else stays.
 */
export function removeReactiveSkill(character: Character, skillId: string): boolean {
    const attachments = attachmentsOf(character);
    const handler = attachments.get(skillId);
    if (!handler) return false;

    attachments.delete(skillId);
    removeReaction(character, handler);
    return true;
}

/**
 * Sets the exact list of reactive skills a character carries: missing
 * ones are granted, extra ones are removed. Pieces attached by other
 * systems are left untouched.
 */
export function setReactiveSkills(character: Character, skillIds: string[]): void {
    const attachments = attachmentsOf(character);

    for (const id of Array.from(attachments.keys())) {
        if (skillIds.indexOf(id) !== -1) continue;
        const handler = attachments.get(id);
        if (handler) {
            attachments.delete(id);
            removeReaction(character, handler);
        }
    }

    for (const id of skillIds) assignReactiveSkill(character, id);
}
