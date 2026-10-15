import type { Character } from '../../src';
import type { StatusDefinition } from '../../src/classes/StatusInstance';
import {
    hasteStatus,
    rageStatus,
    gateOpenedStatus,
    berserkStatus,
    fastDrawStatus,
    perceptionStatus,
    weakPointAttackStatus,
    weakPointDefenceStatus,
    impetuStatus,
    disarmStatus,
    defenceStandStatus,
    footShotStatus,
    concentrationStatus,
    astraStatus,
    stunStatus,
    blindStatus,
} from './statuses';
import { FATIGUE } from './combat/fatigue';
import { heldJobOf } from './constants/jobs';
import { statusModifierSummary } from './statuses';
import type { DamageComponent } from './damage/composer';
import type { ConditionInput } from './combat/conditions';
import type { ImpactProc } from './damage/impact';
import { addReaction, removeReaction } from './damage/reactions';
import type { ReactionHandler } from './damage/reactions';

export type SkillTargeting = 'ENEMY' | 'ALLY' | 'ALL_ENEMIES' | 'ALL_ALLIES' | 'SELF' | 'ANY';

// A reactive skill: it fires when the bearer is attacked instead of
// being chosen as an action.
export type ReactionSpec = {
    // Percent chance (0-100) the reaction triggers on being attacked.
    chance?: number;
    // When true the defender takes no damage (Parry).
    negate?: boolean;
    // Answer once per impact hit received instead of once per attack
    // (Spike Shield builds one counter per impact hit).
    perImpact?: boolean;
    // The counter-attack the defender builds back at the attacker: a
    // list of damage components, resolved as a real attack instance by
    // whoever applies the hit (mitigated, crit-able, full pipeline).
    counterComponents?: (context: {
        // The would-be damage of the hit (before negation).
        incomingDamage: number;
        attacker: Character;
        defender: Character;
    }) => DamageComponent[];
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
    // The mana the skill spends when cast (0/unset = free). The battle
    // engines hide skills the fighter cannot afford and deduct the cost
    // on use.
    manaCost?: number;
    // The cast effect time: how long the skill's animation plays over
    // the target (the battle WAITS for it before the next action).
    // Undefined = the default per damage kind (physical slash /
    // magical blast).
    animationMs?: number;
    // The hp share the skill consumes on cast (30 = 30% of the user's
    // TOTAL hp, at least 1). Paid together with the mana cost; the
    // fighter must survive the payment (at least 1 hp left).
    hpCostPercent?: number;
    // Only usable while the bearer wears a shield (the offhand slot):
    // the UI disables it and the engine refuses it otherwise.
    requiresShield?: boolean;
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
    // e.g. Rest: -20).
    fatigueDelta?: number;
    // When the bearer has a status with this NAME, the skill is hidden
    // from the menus (activation skills like Open Gate disappear once
    // the affinity they awaken is already active).
    hideWhenStatus?: string;
    // Reactive behavior when the bearer is attacked (autofights).
    reaction?: ReactionSpec;
    // Automatic use policy in the auto battles.
    auto?: AutoUsePolicy;
    // Impact pipeline: counter-driven effects the bearer's hits run
    // while the character knows this skill (Silver Bullets).
    impactProcs?: ImpactProc[];
};

// The global skill dictionary: EVERY skill that exists in the app is
// declared here, once, keyed by its id (the key and the spec's id are
// the same value). Content references skills only through ids; the
// catalog resolves them in O(1).
export const Skills: Record<string, SkillSpec> = {
    spike_shield: {
        id: 'spike_shield',
        name: 'Spike Shield',
        description:
            'Answers every impact hit received with a counter-attack of 10 + 20% of your defence as physical damage.',
        targeting: 'SELF',
        reaction: {
            chance: 100,
            perImpact: true,
            counterComponents: ({ defender }) => [{
                kind: 'physical',
                element: 'physical',
                amount: Math.round((10 + defender.getStat('defence') * 0.2) * 100) / 100,
                label: 'Spike Shield',
            }],
        },
    },
    parry: {
        id: 'parry',
        name: 'Parry',
        description:
            'Negates the incoming attack and answers with a counter-attack of 70% of its damage as physical damage.',
        targeting: 'SELF',
        reaction: {
            chance: 100,
            negate: true,
            counterComponents: ({ incomingDamage }) => [{
                kind: 'physical',
                element: 'physical',
                amount: Math.round(incomingDamage * 0.7 * 100) / 100,
                label: 'Parry',
            }],
        },
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
    fire_breath: {
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
    rest: {
        id: 'rest',
        name: 'Rest',
        description: 'Recovers 20 fatigue.',
        targeting: 'SELF',
        fatigueDelta: -20,
    },
    open_gate: {
        id: 'open_gate',
        name: 'Open Gate',
        description: 'Awakens the Gate affinity: unlocks Fire Breath for the rest of the fight.',
        targeting: 'SELF',
        statusOnSelf: gateOpenedStatus(),
        hideWhenStatus: 'Gate Opened',
    },
    boss_regen: {
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

    fast_draw: {
        id: 'fast_draw',
        name: 'Fast Draw',
        description: 'Speed +8 for 6 turns.',
        targeting: 'SELF',
        statusOnSelf: fastDrawStatus(),
        manaCost: 16,
    },
    perception: {
        id: 'perception',
        name: 'Perception',
        description: 'Evasion +20 and crit chance +10% for 5 turns.',
        targeting: 'SELF',
        statusOnSelf: perceptionStatus(),
        manaCost: 12,
    },
    disarm: {
        id: 'disarm',
        name: 'Disarm',
        description: 'The target\'s attack -40% for 5 turns.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        statusOnTargets: disarmStatus(),
        manaCost: 16,
    },
    stand: {
        id: 'stand',
        name: 'Stand',
        description: 'Defence +60%, magic defence +30% for 5 turns.',
        targeting: 'SELF',
        statusOnSelf: defenceStandStatus(),
        manaCost: 16,
    },
    foot_shot: {
        id: 'foot_shot',
        name: 'Foot Shot',
        description: 'The enemy\'s speed -80%, defence -20% for 2 turns.',
        targeting: 'ENEMY',
        statusOnTargets: footShotStatus(),
        manaCost: 16,
    },
    concentration: {
        id: 'concentration',
        name: 'Concentration',
        description: 'Crit chance +70% and crit multiplier +0.40; consumed on your next basic attack.',
        targeting: 'SELF',
        statusOnSelf: concentrationStatus(70, 0.40),
        manaCost: 18,
    },
    perno_magico: {
        id: 'perno_magico',
        name: 'Perno Mágico',
        description: 'Deals 80% of your magic as magical damage.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'magical',
            element: 'arcane',
            amount: Math.round((actor.getStat('magic') * 0.8) * 100) / 100,
            label: 'Perno Mágico',
        }],
        manaCost: 16,
    },
    healing_whispers: {
        id: 'healing_whispers',
        name: 'Healing Whispers',
        description: '60% of your magic.',
        targeting: 'ALLY',
        numberOfTargets: 1,
        healFor: (actor) => Math.round((actor.getStat('magic') * 0.6) * 100) / 100,
        manaCost: 16,
    },
    // ------------------------------------------------------------------
    // The new act-2 kit (defined but NOT wired into any job yet): the
    // protection layer, the hp-paid strike, the shield-gated bash and
    // the reusable Blind/Stun statuses they apply.
    // ------------------------------------------------------------------
    astra: {
        id: 'astra',
        name: 'Astra',
        description: 'Shields the whole team from bad statuses while it lasts.',
        targeting: 'ALL_ALLIES',
        statusOnTargets: astraStatus(),
        manaCost: 14,
    },
    derribo: {
        id: 'derribo',
        name: 'Derribo',
        description: 'A crushing blow: 140% of your attack as physical damage. Costs 30% of your hp.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'physical',
            element: 'physical',
            amount: Math.round(actor.getStat('attack') * 1.4 * 100) / 100,
            label: 'Derribo',
        }],
        hpCostPercent: 30,
    },
    shield_bash: {
        id: 'shield_bash',
        name: 'Shield Bash',
        description: '40% of your attack as blunt physical damage, and the target is stunned for 1 turn. Needs a shield.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'physical',
            element: 'blunt',
            amount: Math.round(actor.getStat('attack') * 0.4 * 100) / 100,
            label: 'Shield Bash',
        }],
        statusOnTargets: stunStatus(),
        manaCost: 10,
        requiresShield: true,
    },
    nature_salve: {
        id: 'nature_salve',
        name: 'Nature Salve',
        description: 'Washes the bad statuses off an ally.',
        targeting: 'ALLY',
        numberOfTargets: 1,
        dispel: { onAlly: 'negative' },
        manaCost: 8,
    },
    focus_the_eyes: {
        id: 'focus_the_eyes',
        name: 'Focus the Eyes',
        description: 'Blinds the enemy: accuracy −45% for 3 turns.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        statusOnTargets: blindStatus(),
    },
    double_strike: {
        id: 'double_strike',
        name: 'Double Strike',
        description: '8 + 80% of your magic as magic damage to 2 targets.',
        targeting: 'ENEMY',
        numberOfTargets: 2,
        damageFor: (actor) => [{
            kind: 'magical',
            element: 'arcane',
            amount: Math.round((8 + actor.getStat('magic') * 0.8) * 100) / 100,
            label: 'Double Strike',
        }],
        manaCost: 16,
    },
    weak_point: {
        id: 'weak_point',
        name: 'Weak Point',
        description: 'The enemy\'s attack -40% for 4 turns and defence -40% for 3 turns.',
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
        manaCost: 14,
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
        // The healer answers wounds: whenever the most hurt ally drops
        // below 30% hp, Cure locks on the lowest-hp ally. The shared
        // cooldown keeps a whole line of mages from over-healing the
        // same wound at once.
        auto: {
            conditions: [{ ref: 'lowestAllyHpBelow30' }],
            chancePercent: 100,
            cooldownActions: 2,
            sharedCooldown: true,
            target: { side: 'ally', prefer: 'lowest_hp' },
        },
    },
    impetu: {
        id: 'impetu',
        name: 'Impetu',
        description: 'Attack +10 and +20%, speed +10 for 1 turn.',
        targeting: 'SELF',
        statusOnSelf: impetuStatus(),
    },
    first_aid: {
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
    silver_bolts: {
        id: 'silver_bolts',
        name: 'Silver Bolts',
        description:
            'Passive: every 3rd hit against the same enemy deals 10% of its max hp as true damage.',
        targeting: 'ENEMY',
        impactProcs: [
            {
                id: 'silver_bolts',
                moment: 'hit',
                // TEMP (stress test true-damage visibility): every hit
                // instead of every 3rd. REVERT TO 3.
                every: 1,
                perTarget: true,
                onTrigger: (ctx) => {
                    ctx.components.push({
                        kind: 'true',
                        element: 'true',
                        amount: Math.round(ctx.defender.getStat('totalHp') * 0.1 * 100) / 100,
                        label: 'Silver Bolts',
                    });
                },
            },
        ],
    },
    // ------------------------------------------------------------------
    // Skill ranks (job enhancement levels). Each rank is its own catalog
    // entry; the job ladders point at them. Placeholder scaling until
    // the real numbers land: damage/heal ×1.4 (rank 2) and ×1.8
    // (rank 3), statuses +1/+2 turns (Concentration +5/+10 points),
    // mana +4/+8 (Astra and Nature Salve get cheaper instead).
    // ------------------------------------------------------------------
    disarm_2: {
        id: 'disarm_2',
        name: 'Disarm +',
        description: 'The target\'s attack -65% for 5 turns.',
        targeting: 'ANY',
        numberOfTargets: 1,
        statusOnTargets: disarmStatus(5, 65),
        manaCost: 18,
    },
    disarm_3: {
        id: 'disarm_3',
        name: 'Disarm ++',
        description: 'The target\'s attack -65% for 6 turns.',
        targeting: 'ANY',
        numberOfTargets: 1,
        statusOnTargets: disarmStatus(6, 65),
        manaCost: 20,
    },
    stand_2: {
        id: 'stand_2',
        name: 'Stand +',
        description: 'Defence +70%, magic defence +50% for 5 turns.',
        targeting: 'SELF',
        statusOnSelf: defenceStandStatus(5, 70, 50),
        manaCost: 18,
    },
    stand_3: {
        id: 'stand_3',
        name: 'Stand ++',
        description: 'Defence +80%, magic defence +60% for 6 turns.',
        targeting: 'SELF',
        statusOnSelf: defenceStandStatus(6, 80, 60),
        manaCost: 20,
    },
    foot_shot_2: {
        id: 'foot_shot_2',
        name: 'Foot Shot +',
        description: 'The enemy\'s speed -80% and defence -30% for 3 turns.',
        targeting: 'ENEMY',
        statusOnTargets: footShotStatus(3, 80, 30),
        manaCost: 18,
    },
    foot_shot_3: {
        id: 'foot_shot_3',
        name: 'Foot Shot ++',
        description: 'The enemy\'s speed -80% and defence -30% for 3 turns.',
        targeting: 'ENEMY',
        numberOfTargets: 2,
        statusOnTargets: footShotStatus(3, 80, 30),
        manaCost: 20,
    },
    concentration_2: {
        id: 'concentration_2',
        name: 'Concentration +',
        description: 'Crit chance +55% and crit multiplier +0.85, consumed on your next basic attack.',
        targeting: 'SELF',
        statusOnSelf: concentrationStatus(55, 0.85),
        manaCost: 18,
    },
    concentration_3: {
        id: 'concentration_3',
        name: 'Concentration ++',
        description: 'Crit chance +70% and crit multiplier +1; consumed on your next basic attack.',
        targeting: 'SELF',
        statusOnSelf: concentrationStatus(70, 1),
        manaCost: 22,
    },
    perno_magico_2: {
        id: 'perno_magico_2',
        name: 'Perno Mágico +',
        description: 'Deals 112% of your magic as magical damage.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'magical',
            element: 'arcane',
            amount: Math.round((actor.getStat('magic') * 1.12) * 100) / 100,
            label: 'Perno Mágico II',
        }],
        manaCost: 16,
    },
    perno_magico_3: {
        id: 'perno_magico_3',
        name: 'Perno Mágico ++',
        description: 'Deals 144% of your magic as magical damage.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'magical',
            element: 'arcane',
            amount: Math.round((actor.getStat('magic') * 1.44) * 100) / 100,
            label: 'Perno Mágico III',
        }],
        manaCost: 18,
    },
    healing_whispers_2: {
        id: 'healing_whispers_2',
        name: 'Healing Whispers +',
        description: 'Heals 84% of your magic.',
        targeting: 'ALLY',
        numberOfTargets: 1,
        healFor: (actor) => Math.round((actor.getStat('magic') * 0.84) * 100) / 100,
        manaCost: 20,
    },
    healing_whispers_3: {
        id: 'healing_whispers_3',
        name: 'Healing Whispers ++',
        description: 'Heals 108% of your magic.',
        targeting: 'ALLY',
        numberOfTargets: 1,
        healFor: (actor) => Math.round((actor.getStat('magic') * 1.08) * 100) / 100,
        manaCost: 24,
    },
    shield_bash_2: {
        id: 'shield_bash_2',
        name: 'Shield Bash +',
        description: '56% of your attack as blunt physical damage, and the target is stunned for 1 turn. Needs a shield.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'physical',
            element: 'blunt',
            amount: Math.round(actor.getStat('attack') * 0.56 * 100) / 100,
            label: 'Shield Bash +',
        }],
        statusOnTargets: stunStatus(),
        manaCost: 14,
        requiresShield: true,
    },
    shield_bash_3: {
        id: 'shield_bash_3',
        name: 'Shield Bash ++',
        description: '72% of your attack and 30% of your defence as blunt physical damage, ' +
            'and the target is stunned for 1 turn. Needs a shield.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'physical',
            element: 'blunt',
            amount: Math.round((actor.getStat('attack') * 0.72 + actor.getStat('defence') * 0.3) * 100) / 100,
            label: 'Shield Bash ++',
        }],
        statusOnTargets: stunStatus(),
        manaCost: 18,
        requiresShield: true,
    },
    derribo_2: {
        id: 'derribo_2',
        name: 'Derribo +',
        description: 'A crushing blow: 196% of your attack as physical damage. Costs 35% of your hp.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'physical',
            element: 'physical',
            amount: Math.round(actor.getStat('attack') * 1.96 * 100) / 100,
            label: 'Derribo +',
        }],
        hpCostPercent: 35,
    },
    derribo_3: {
        id: 'derribo_3',
        name: 'Derribo ++',
        description: 'A crushing blow: 252% of your attack as physical damage. Costs 35% of your hp.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        damageFor: (actor) => [{
            kind: 'physical',
            element: 'physical',
            amount: Math.round(actor.getStat('attack') * 2.52 * 100) / 100,
            label: 'Derribo ++',
        }],
        hpCostPercent: 35,
    },
    nature_salve_2: {
        id: 'nature_salve_2',
        name: 'Nature Salve +',
        description: 'Washes the bad statuses off an ally, heals 15% of their max HP.',
        targeting: 'ALLY',
        numberOfTargets: 1,
        dispel: { onAlly: 'negative' },
        manaCost: 6,
        healFor: (actor, target) => Math.round(target.getStat('totalHp') * 0.15 * 100) / 100,
    },
    nature_salve_3: {
        id: 'nature_salve_3',
        name: 'Nature Salve ++',
        description: 'Washes the bad statuses off an ally, heals 25% of their max HP.',
        targeting: 'ALLY',
        numberOfTargets: 1,
        dispel: { onAlly: 'negative' },
        manaCost: 4,
        healFor: (actor, target) => Math.round(target.getStat('totalHp') * 0.25 * 100) / 100,
    },
    focus_the_eyes_2: {
        id: 'focus_the_eyes_2',
        name: 'Focus the Eyes +',
        description: 'Blinds the enemy: accuracy −45% for 4 turns.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        statusOnTargets: blindStatus(4),
    },
    focus_the_eyes_3: {
        id: 'focus_the_eyes_3',
        name: 'Focus the Eyes ++',
        description: 'Blinds the enemy: accuracy −45% for 4 turns.',
        targeting: 'ENEMY',
        numberOfTargets: 2,
        statusOnTargets: blindStatus(4),
    },
    double_strike_2: {
        id: 'double_strike_2',
        name: 'Double Strike +',
        description: '12 + 112% of your magic as magic damage to 2 targets.',
        targeting: 'ENEMY',
        numberOfTargets: 2,
        damageFor: (actor) => [{
            kind: 'magical',
            element: 'arcane',
            amount: Math.round((12 + actor.getStat('magic') * 1.12) * 100) / 100,
            label: 'Double Strike +',
        }],
        manaCost: 20,
    },
    double_strike_3: {
        id: 'double_strike_3',
        name: 'Double Strike ++',
        description: '16 + 144% of your magic as magic damage to 2 targets.',
        targeting: 'ENEMY',
        numberOfTargets: 2,
        damageFor: (actor) => [{
            kind: 'magical',
            element: 'arcane',
            amount: Math.round((16 + actor.getStat('magic') * 1.44) * 100) / 100,
            label: 'Double Strike ++',
        }],
        manaCost: 24,
    },
    astra_2: {
        id: 'astra_2',
        name: 'Astra +',
        description: 'Shields the whole team from bad statuses while it lasts.',
        targeting: 'ALL_ALLIES',
        statusOnTargets: astraStatus(),
        manaCost: 12,
    },
    astra_3: {
        id: 'astra_3',
        name: 'Astra ++ ',
        description: 'Shields the whole team from bad statuses while it lasts.',
        targeting: 'ALL_ALLIES',
        statusOnTargets: astraStatus(),
        manaCost: 10,
    },
};

// The typed skill id: every id reference in content (job kits, kits
// maps, the defaults) is one of these, derived from the dictionary —
// no magic strings survive, and a typo fails the build.
export type SkillId = keyof typeof Skills;

// Skills every character knows by default (the fatigue management kit).
export const DEFAULT_SKILLS: SkillId[] = ['rest'];

/**
 * The default kit actually offered to a character. While the fatigue
 * system is switched off, Rest (a pure fatigue skill) is hidden.
 */
export function defaultSkillIds(): string[] {
    return FATIGUE.enabled ? DEFAULT_SKILLS : [];
}

// Base skill ids available per character id: the job of the character
// provides the recruit kits; extra entries live here.
export const CHARACTER_SKILLS: Record<string, SkillId[]> = {
    // The lord's son awakens his Gate affinity first: Fire Breath comes
    // from the awakened status, not from the base kit.
    lord_son: ['open_gate'],
};

export function skillIdsOf(character: Character): string[] {
    // The generator's explicit kit wins over the content map, which
    // wins over the held job's kit.
    return character.skillIds ?? CHARACTER_SKILLS[character.id] ?? heldJobOf(character)?.skillIds ?? [];
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
    return Skills[skillId];
}

/**
 * The compact effect summary of a skill for UI tooltips: only the stat
 * changes of the statuses it applies ('evasion +20 · critChance +3%'),
 * plus how many turns each status lasts, with no skill name or status
 * titles (the cell label already shows the name). Skills without stat
 * changes fall back to the description.
 */
export function skillEffectSummary(spec: SkillSpec): string {
    const parts: string[] = [];
    const statuses = [
        spec.statusOnSelf,
        spec.statusOnTargets,
        ...(spec.statusesOnTargets ?? []),
    ];
    for (const definition of statuses) {
        if (!definition) continue;
        const modifiers = statusModifierSummary(definition);
        if (modifiers.length === 0) continue;
        const text = definition.turns !== undefined ?
            `${modifiers.join(' · ')} · ${definition.turns} turns` :
            modifiers.join(' · ');
        parts.push(text);
    }
    if (parts.length === 0) return spec.description;
    return parts.join(' · ');
}

/**
 * Every skill defined in the catalog, in definition order. The skill
 * catalog view consumes this.
 */
export function allSkillSpecs(): SkillSpec[] {
    return Object.values(Skills);
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

    return ({ incomingDamage, impactHits, attacker, defender, random }) => {
        // A 100% chance always triggers; anything below rolls the RNG.
        if (reaction.chance !== undefined && reaction.chance < 100 && random() * 100 >= reaction.chance) {
            return null;
        }

        // Answer once per attack, or once per impact hit received (the
        // Spike Shield builds one counter per impact).
        const answers = reaction.perImpact ? Math.max(1, impactHits) : 1;
        const counter: DamageComponent[] = [];
        for (let answer = 0; answer < answers; answer++) {
            const built = reaction.counterComponents?.({ incomingDamage, attacker, defender }) ?? [];
            counter.push(...built);
        }

        return {
            damage: reaction.negate ? 0 : incomingDamage,
            counter: counter.length > 0 ? counter : undefined,
            note: reaction.negate ? 'parried!' : counter.length > 0 ? 'spiked' : undefined,
        };
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
