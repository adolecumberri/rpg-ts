import type { Character } from '@rpg';
import {
    DamageComposer,
    attackComponentsOf,
    defenceLayersOf,
    kindMultiplierFor,
    kindOfElement,
    kindTotalsOfBreakdown,
    mergeComponents,
} from '@core';
import type { SkillSpec } from '@core';
import type { DamageComponent } from '@core';
import './CombatForecast.css';

/**
 * The Combat Forecast — the React port of the design-stitch
 * code_combat_forecast reference. The main component receives the
 * attack resolution (hit rate, expected damage and its composition)
 * and renders ONLY the FFTA2 HIT gauge: the 3D wordmark, the
 * proportional arrow and the accuracy + theoretical damage readout.
 * The combatant cards are the same element (CombatForecastCard) but
 * live inside the target screen's bar, in places 1 and 2.
 */

export type ForecastDamageKind = 'physical' | 'magical' | 'true';

// One resolved attack preview: what the HIT gauge shows.
export type ForecastAttack = {
    // 0-100 hit chance.
    hitRate: number;
    // The expected damage number (already processed by the caller).
    damage: number;
    // The damage composition (drives the number's color per mix).
    kinds: ForecastDamageKind[];
};

// The stats a card shows: name, level, hp and mana.
export type ForecastCombatant = {
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
};

// The mix color class key: kinds sorted alphabetically and joined.
function kindKeyOf(kinds: ForecastDamageKind[]): string {
    const list = Array.from(new Set(kinds)).sort();
    return list.length > 0 ? list.join('-') : 'physical';
}

/**
 * The pure attack preview the forecast shows: the hit chance
 * (accuracy vs evasion) and the expected damage resolved through the
 * composer's own math — no rolls, no statuses, no side effects, so it
 * never advances the real battle.
 */
export function previewAttack(attacker: Character, defender: Character): ForecastAttack {
    return forecastOf(
        mergeComponents(attackComponentsOf(attacker)),
        attacker,
        defender,
    );
}

/**
 * The forecast of a damage skill against a defender: the skill's own
 * components (static or actor-scaled) through the same pure composer
 * math. Status-only skills (no components) return undefined — there is
 * no damage to forecast.
 */
export function previewSkillAttack(
    spec: SkillSpec,
    attacker: Character,
    defender: Character,
): ForecastAttack | undefined {
    const raw = spec.damageFor ? spec.damageFor(attacker) : spec.damage;
    if (!raw || raw.length === 0) return undefined;
    // The same kind fallback the skill resolver applies on cast.
    const components = mergeComponents(raw.map((component) => ({
        ...component,
        kind: component.kind ?? kindOfElement(component.element),
    })));
    return forecastOf(components, attacker, defender);
}

// The shared forecast math: the composer's expected damage (with its
// kind mix) and the hit chance from accuracy vs evasion.
function forecastOf(
    components: DamageComponent[],
    attacker: Character,
    defender: Character,
): ForecastAttack {
    const result = DamageComposer.resolveKinds(
        components,
        defenceLayersOf(defender),
        kindMultiplierFor(defender),
        { breakdown: true },
    );
    const totals = kindTotalsOfBreakdown(result.breakdown);

    const kinds: ForecastDamageKind[] = [];
    if ((totals.physical ?? 0) > 0) kinds.push('physical');
    if ((totals.magical ?? 0) > 0) kinds.push('magical');
    if ((totals.true ?? 0) > 0) kinds.push('true');

    const evasion = Math.min(100, defender.getStat('evasion'));
    const accuracy = attacker.getStat('accuracy');
    const hitRate = Math.max(0, Math.min(100, Math.round(accuracy * (1 - evasion / 100))));

    return {
        hitRate,
        damage: Math.max(1, Math.round(result.total)),
        kinds: kinds.length > 0 ? kinds : ['physical'],
    };
}

/** One combatant matchup card: name, level, HP and MANA gauges. The
 *  `compact` variant fits the action bar's banner slot (buttons 1+2);
 *  the `cell` variant fits ONE button-sized cell (the target screen's
 *  places 1 and 2). */
export function CombatForecastCard({
    combatant,
    enemy = false,
    compact = false,
    cell = false,
}: {
    combatant: ForecastCombatant;
    enemy?: boolean;
    compact?: boolean;
    cell?: boolean;
}) {
    const hpPct = combatant.maxHp > 0 ?
        Math.max(0, Math.min(100, (combatant.hp / combatant.maxHp) * 100)) :
        0;
    const manaPct = combatant.maxMana > 0 ?
        Math.max(0, Math.min(100, (combatant.mana / combatant.maxMana) * 100)) :
        0;

    const variant = cell ? ' cf-combatant--cell' : compact ? ' cf-combatant--compact' : '';
    return (
        <div className={`cf-combatant${enemy ? ' cf-combatant--enemy' : ''}${variant}`}>
            <div className="cf-combatant-head">
                <span className="cf-combatant-dot">●</span>
                <span className="cf-combatant-name">{combatant.name}</span>
                <span className="cf-combatant-lvl">Lv.{combatant.level}</span>
            </div>
            <div className="cf-combatant-gauges">
                <div className="cf-gauge cf-gauge--hp">
                    <div className="cf-gauge-fill" style={{ width: `${hpPct}%` }} />
                    <span className="cf-gauge-text">HP {combatant.hp}/{combatant.maxHp}</span>
                </div>
                <div className="cf-gauge cf-gauge--mana">
                    <div className="cf-gauge-fill" style={{ width: `${manaPct}%` }} />
                    <span className="cf-gauge-text"> {combatant.mana}/{combatant.maxMana}</span>
                </div>
            </div>
        </div>
    );
}

/**
 * The forecast view: ONLY the HIT gauge — the wordmark, the
 * proportional arrow and the percentage + theoretical damage readout.
 * The combatant cards render in the target screen's bar (places 1+2).
 */
export function CombatForecast({
    attack,
}: {
    attack: ForecastAttack;
}) {
    const clamped = Math.max(0, Math.min(100, attack.hitRate));
    // The arrow's full horizontal extent (the fill sweeps through the
    // triangular tip).
    const fillWidth = (clamped / 100) * 210;
    const isMax = clamped >= 100;

    return (
        <div className="cf-root">
            <div className={`cf-hit${isMax ? ' is-max-hit' : ''}`}>
                <div className="cf-hit-row">
                    <span className="cf-hit-logo">HIT</span>
                    <div className="cf-hit-arrow">
                        <svg className="cf-hit-arrow-svg" viewBox="0 0 210 34" preserveAspectRatio="none">
                            <defs>
                                {/* Continuous 5-stop vibrant spectrum */}
                                <linearGradient id="cf-hit-grad" x1="0%" x2="100%" y1="50%" y2="50%">
                                    <stop offset="0%" stopColor="#3249c8" />
                                    <stop offset="22%" stopColor="#1d78f2" />
                                    <stop offset="48%" stopColor="#06b6d4" />
                                    <stop offset="76%" stopColor="#84cc16" />
                                    <stop offset="100%" stopColor="#facc15" />
                                </linearGradient>
                                {/* Dynamic fill clip: spans 0px to 210px */}
                                <clipPath id="cf-fill-clip">
                                    <rect height="42" width={fillWidth} x="0" y="-5" />
                                </clipPath>
                                {/* Arrow silhouette */}
                                <path
                                    d="M 12 5 L 161 5 L 164 -5 L 210 12 L 149 40 L 152 30 L 5 30 L 15 5 Z"
                                    id="cf-arrow-contour"
                                />
                            </defs>

                            {/* Outer 3D drop edge shadow */}
                            <path
                                d="M 14 7 L 174 7 L 174 3 L 210 20 L 174 37 L 174 33 L 6 33 Z"
                                fill="#140a04"
                                opacity="0.8"
                            />

                            {/* Dark track background (empty sunken silhouette) */}
                            <use fill="#170c05" href="#cf-arrow-contour" />

                            {/* Grid & track markings */}
                            <g opacity="0.3">
                                <line stroke="#99907c" strokeDasharray="2 2" strokeWidth="1" x1="45" x2="45" y1="5" y2="29" />
                                <line stroke="#99907c" strokeDasharray="2 2" strokeWidth="1" x1="90" x2="90" y1="5" y2="29" />
                                <line stroke="#99907c" strokeDasharray="2 2" strokeWidth="1" x1="135" x2="135" y1="5" y2="29" />
                            </g>

                            {/* Active meter fill, masked smoothly into the tip */}
                            <g clipPath="url(#cf-fill-clip)">
                                <use fill="url(#cf-hit-grad)" href="#cf-arrow-contour" />
                            </g>

                            {/* Permanent crisp gilded bevel border */}
                            <use
                                fill="none"
                                href="#cf-arrow-contour"
                                stroke={isMax ? '#fff088' : '#d4af37'}
                                strokeWidth={isMax ? 2.2 : 1.8}
                            />
                            <use fill="none" href="#cf-arrow-contour" opacity="0.5" stroke="#ffd875" strokeWidth="0.8" />
                            {/* 100% radiance pulse overlay */}
                            <use
                                fill="none"
                                href="#cf-arrow-contour"
                                opacity={isMax ? 0.7 : 0}
                                stroke="#ffffff"
                                strokeWidth="2"
                            />
                        </svg>
                        <div className="cf-hit-readout">
                            <span className="cf-hit-acc">
                                <span className="cf-pop">{Math.round(clamped)}</span>
                                <span className="cf-hit-pct">%</span>
                            </span>
                            <span className={`cf-hit-dmg cf-hit-dmg--${kindKeyOf(attack.kinds)}`}>
                                {attack.damage}
                                <span className="cf-hit-pts">
                                    pt(s)
                                </span>
                            </span>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
