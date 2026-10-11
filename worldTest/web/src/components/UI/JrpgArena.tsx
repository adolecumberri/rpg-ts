import { useEffect, useRef, useState } from 'react';
import type { Character } from '@rpg';
import { heldJobOf, specOf, skillEffectSummary } from '@core';
import type { SkillSpec } from '@core';
import { SPRITES, spriteRoleOf } from '../../assets/sprites';
import type { SpriteSet } from '../../assets/sprites';
import { OptionsBar } from './OptionsBar';
import { TargetBar } from './TargetBar';
import { StatusChips } from './StatusChips';
import { CombatForecast, previewAttack, previewSkillAttack } from './CombatForecast';
import type { ForecastCombatant } from './CombatForecast';
import { selectionRulesOf } from '../../game/targeting';

/**
 * The JRPG pseudo-3D tactical arena (the small-battle view, per the
 * design-stitch code_fight reference): a tilted FFTA2-grid floor with
 * three depth tiers for the combatant sprites, micro hp bars, the
 * active-turn cursor and tile, the turn-order chip strip, the active
 * unit banner and the 2x2 command tray. Pure presentation — the
 * CombatScreen keeps owning the hybrid engine.
 */

type DepthTier = 'front' | 'center' | 'back';

const TIERS: Record<DepthTier, { cls: string; ally: { x: number; y: number }; enemy: { x: number; y: number } }> = {
    front: { cls: 'jrpg-depth-front', ally: { x: 115, y: 302 }, enemy: { x: 205, y: 302 } },
    center: { cls: 'jrpg-depth-mid', ally: { x: 78, y: 228 }, enemy: { x: 235, y: 228 } },
    back: { cls: 'jrpg-depth-far', ally: { x: 54, y: 165 }, enemy: { x: 258, y: 165 } },
};

function tierOf(character: Character): DepthTier {
    if (character.position === 'back') return 'back';
    if (character.position === 'center') return 'center';
    return 'front';
}

// The arena spot (the feet anchor) of a combatant: the tier's base
// point, fanned out by the unit's index within the tier.
function positionOf(tier: DepthTier, side: 'ally' | 'enemy', index: number): { x: number; y: number } {
    const base = TIERS[tier][side];
    const spread = side === 'ally' ? index * 26 : -index * 26;
    return { x: base.x + spread, y: base.y - index * 12 };
}

/** One combatant entity anchored in the tilted arena. */
function ArenaEntity({
    character,
    side,
    tier,
    index,
    active,
    targeted,
    inspected,
    onClick,
    onTip,
}: {
    character: Character;
    side: 'ally' | 'enemy';
    tier: DepthTier;
    index: number;
    active?: boolean;
    targeted?: boolean;
    inspected?: boolean;
    onClick?: () => void;
    // Forwarded to the status chips: the arena owns the tooltip overlay.
    onTip?: (tip: { text: string; anchor: Element } | null) => void;
}) {
    const { x, y } = positionOf(tier, side, index);

    const hp = Math.round(character.stats.hp);
    const maxHp = Math.round(character.stats.totalHp);
    const pct = maxHp > 0 ? Math.max(0, Math.min(100, Math.round(hp / maxHp * 100))) : 0;
    const sheet: SpriteSet = SPRITES[spriteRoleOf(character) ?? 'warrior'];

    return (
        <div
            data-unit-id={character.id}
            className={[
                'jrpg-entity',
                side === 'enemy' ? 'jrpg-enemy-side' : 'jrpg-ally-side',
                TIERS[tier].cls,
                active ? 'jrpg-entity--active' : '',
                targeted ? 'jrpg-entity--targeted' : '',
                inspected ? 'jrpg-entity--inspected' : '',
                hp <= 0 ? 'jrpg-entity--dead' : '',
            ].join(' ')}
            style={{ left: x, top: y }}
            onClick={onClick}
        >
            {active ? <span className="jrpg-cursor-arrow" /> : null}
            {targeted ? <span className="jrpg-target-arrow" /> : null}
            <StatusChips character={character} onTip={onTip} />
            <span className="jrpg-entity-shadow" />
            <span className="jrpg-micro-hp">
                <span
                    className="jrpg-micro-hp-fill"
                    style={{ width: `${pct}%` }}
                />
            </span>
            <span
                className="jrpg-sprite-box"
                style={{ backgroundImage: `url(${sheet.idle})` }}
            />
        </div>
    );
}

/** The turn-order chip strip: the next fighters by their interval. */
function TurnOrderStrip({
    chips,
    activeId,
}: {
    chips: { id: string; enemy: boolean }[];
    activeId?: string;
}) {
    return (
        <div className="jrpg-turn-order-strip">
            {chips.slice(0, 5).map((chip, index) => (
                <span
                    key={chip.id}
                    className={[
                        'jrpg-order-chip',
                        chip.enemy ? 'jrpg-order-chip--enemy' : '',
                        chip.id === activeId ? 'jrpg-order-chip--current' : '',
                    ].join(' ')}
                >
                    {index + 1}
                </span>
            ))}
        </div>
    );
}

export function JrpgArena({
    allies,
    enemies,
    activeId,
    inspectedId,
    skillIds,
    targets,
    onTarget,
    onInspect,
    onSkill,
    onFlee,
}: {
    allies: Character[];
    enemies: Character[];
    // The actor waiting for a target (the manual prompt).
    activeId?: string;
    // The combatant the player tapped for inspection.
    inspectedId?: string;
    // The actor's skill ids (the manual prompt's skills).
    skillIds?: string[];
    // The enemies the actor may attack (the manual prompt's targets).
    targets: { id: string; label: string }[];
    onTarget: (id: string) => void;
    onInspect: (id: string) => void;
    // Cast a skill; the optional targetId is the player's pick for
    // single-target skills (SELF and whole-side skills need none).
    onSkill: (skillId: string, targetId?: string) => void;
    onFlee: () => void;
}) {
    // The battle flows: commands -> (Skills list | target pick) ->
    // commit. `attacking` marks the target pick, `skillsOpen` the
    // skill list, and `pendingSkillId` the skill waiting for a target.
    const [attacking, setAttacking] = useState(false);
    const [skillsOpen, setSkillsOpen] = useState(false);
    const [pendingSkillId, setPendingSkillId] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selection, setSelection] = useState<string[]>([]);
    // The single shared tooltip overlay: chip hovers report here so the
    // tooltip renders outside the tier-scaled entities.
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [chipTip, setChipTip] = useState<{ text: string; x: number; y: number } | null>(null);

    const showChipTip = (payload: { text: string; anchor: Element } | null) => {
        if (!payload) {
            setChipTip(null);
            return;
        }
        const root = rootRef.current;
        if (!root) return;
        const anchor = payload.anchor.getBoundingClientRect();
        const frame = root.getBoundingClientRect();
        setChipTip({
            text: payload.text,
            // Centered over the chip, just above its top edge.
            x: anchor.left - frame.left + anchor.width / 2,
            y: anchor.top - frame.top - 8,
        });
    };

    useEffect(() => {
        setAttacking(false);
        setSkillsOpen(false);
        setPendingSkillId(null);
        setSelection([]);
        setChipTip(null);
    }, [activeId]);

    // ---- the arena entities -------------------------------------------
    // One placement per combatant: the acting unit always steps to the
    // frontline, the others keep their position tier. Shared by the
    // entities and the active tile so they always align.
    const placementsOf = (side: 'ally' | 'enemy', pool: Character[]) => {
        const byTier = new Map<DepthTier, Character[]>();
        for (const character of pool) {
            const tier: DepthTier = character.id === activeId ? 'front' : tierOf(character);
            const list = byTier.get(tier) ?? [];
            list.push(character);
            byTier.set(tier, list);
        }
        const placements: { character: Character; tier: DepthTier; index: number }[] = [];
        for (const tier of ['back', 'center', 'front'] as DepthTier[]) {
            const list = byTier.get(tier) ?? [];
            list.forEach((character, index) => {
                placements.push({ character, tier, index });
            });
        }
        return placements;
    };

    const renderSide = (side: 'ally' | 'enemy', pool: Character[]) => {
        return placementsOf(side, pool).map(({ character, tier, index }) => {
            // In target mode, tapping a valid target selects it (the
            // cards and the forecast follow); any other tap inspects.
            // Attacks pick enemies; ALLY/ANY skills also pick allies.
            const pickable = attacking && (side === 'enemy' ||
                pendingSpec?.targeting === 'ALLY' ||
                pendingSpec?.targeting === 'ANY');
            const onClick = attacking ?
                () => {
                    if (pickable) setSelection([character.id]);
                    else onInspect(character.id);
                } :
                () => onInspect(character.id);
            return (
                <ArenaEntity
                    key={character.id}
                    character={character}
                    side={side}
                    tier={tier}
                    index={index}
                    active={character.id === activeId}
                    targeted={attacking && selection.includes(character.id)}
                    inspected={character.id === inspectedId}
                    onClick={onClick}
                    onTip={showChipTip}
                />
            );
        });
    };

    // The tile under the acting unit's feet: its real arena spot (the
    // tier fan included), so the marker never drifts off the sprite.
    const actorPlacement = activeId ?
        placementsOf('ally', allies).find((entry) => entry.character.id === activeId) :
        undefined;
    const actorSpot = actorPlacement ?
        positionOf(actorPlacement.tier, 'ally', actorPlacement.index) :
        undefined;

    // ---- the HUD banner character -------------------------------------
    const bannerCharacter = allies.find((entry) => entry.id === activeId) ??
        [activeId, inspectedId]
            .map((id) => allies.concat(enemies).find((entry) => entry.id === id))
            .find(Boolean) ??
        allies[0];
    const bannerIsTurn = Boolean(bannerCharacter && bannerCharacter.id === activeId);
    const bannerHp = bannerCharacter ? Math.round(bannerCharacter.stats.hp) : 0;
    const bannerMaxHp = bannerCharacter ? Math.round(bannerCharacter.stats.totalHp) : 0;
    const bannerMana = bannerCharacter ? Math.round(bannerCharacter.stats.mana ?? 0) : 0;
    const bannerTotalMana = bannerCharacter ? Math.round(bannerCharacter.stats.totalMana ?? 0) : 0;
    const bannerLevel = bannerCharacter ? bannerCharacter.experience.level : 0;
    const bannerJob = bannerCharacter ? heldJobOf(bannerCharacter)?.title ?? '' : '';
    const bannerSprite = bannerCharacter ? SPRITES[spriteRoleOf(bannerCharacter) ?? 'warrior'].idle : undefined;
    const bannerName = bannerCharacter ? bannerCharacter.name : '—';

    const skills = (skillIds ?? [])
        .map((id) => specOf(id))
        .filter((spec): spec is NonNullable<ReturnType<typeof specOf>> => Boolean(spec));

    // The skill waiting for a target (null while attacking normally).
    const pendingSpec = pendingSkillId ? specOf(pendingSkillId) : undefined;

    // The pickable targets: attacks and ENEMY skills pick enemies,
    // ALLY skills pick allies, ANY skills both sides.
    const allyTargets = allies.map((entry) => ({ id: entry.id, label: entry.name }));
    const targetPool = pendingSpec ?
        pendingSpec.targeting === 'ALLY' ?
            allyTargets :
            pendingSpec.targeting === 'ANY' ?
                targets.concat(allyTargets) :
                targets :
        targets;

    // The forecast: the real hit chance and the composer's expected
    // damage against the selected target (only shown once one is
    // picked). Damage skills preview their own components; status-only
    // skills show no gauge.
    const actor = allies.find((entry) => entry.id === activeId);
    const forecastTarget = selection[0] ?
        allies.concat(enemies).find((entry) => entry.id === selection[0]) :
        undefined;
    const forecast = actor && forecastTarget ?
        pendingSpec ?
            previewSkillAttack(pendingSpec, actor, forecastTarget) :
            previewAttack(actor, forecastTarget) :
        undefined;
    const rules = selectionRulesOf({ targeting: 'ENEMY', count: 1, poolSize: targetPool.length });

    const combatantOf = (character: Character): ForecastCombatant => ({
        name: character.name,
        level: character.experience.level,
        hp: Math.round(character.stats.hp),
        maxHp: Math.round(character.stats.totalHp),
        mana: Math.round(character.stats.mana ?? 0),
        maxMana: Math.round(character.stats.totalMana ?? 0),
    });

    // Commit the picked target (the attack or the pending skill) and
    // leave target mode; cancel aborts the whole pick.
    const commitSelection = () => {
        if (!selection[0]) return;
        if (pendingSkillId) {
            onSkill(pendingSkillId, selection[0]);
        } else {
            onTarget(selection[0]);
        }
        setAttacking(false);
        setSkillsOpen(false);
        setPendingSkillId(null);
        setSelection([]);
    };
    const cancelTargeting = () => {
        setAttacking(false);
        setSkillsOpen(false);
        setPendingSkillId(null);
        setSelection([]);
    };

    // Picking a skill from the list: whole-side and self skills cast
    // immediately; single-target skills move to the target pick.
    const chooseSkill = (spec: SkillSpec) => {
        setSkillsOpen(false);
        if (spec.targeting === 'SELF' ||
            spec.targeting === 'ALL_ENEMIES' ||
            spec.targeting === 'ALL_ALLIES') {
            onSkill(spec.id);
            return;
        }
        setPendingSkillId(spec.id);
        setSelection([]);
        setAttacking(true);
    };

    return (
        <div className="jrpg-combat" ref={rootRef}>
            {/* ---- the battle header: the acting character + menu ------ */}
            <div className="jrpg-header">
                <div className="jrpg-turn-left">
                    <div className="jrpg-turn-avatar" style={bannerSprite ? { backgroundImage: `url(${bannerSprite})` } : undefined} />
                    <div className="jrpg-turn-name-group">
                        <div className="jrpg-turn-name">
                            {bannerName}
                            <span className={bannerIsTurn ? 'jrpg-turn-tag' : 'jrpg-info-tag'}>
                                {bannerIsTurn ? '[TURN]' : '[INFO]'}
                            </span>
                        </div>
                        <div className="jrpg-turn-class">LV. {bannerLevel} · {bannerJob}</div>
                    </div>
                </div>
                <div className="jrpg-header-right">
                    <div className="jrpg-turn-stats">
                        <div className="jrpg-stat-pill jrpg-stat-pill--hp">HP {bannerHp}/{bannerMaxHp}</div>
                        <div className="jrpg-stat-pill jrpg-stat-pill--mana">MANA {bannerMana}/{bannerTotalMana}</div>
                    </div>
                    <div className="jrpg-menu-wrap">
                        <button
                            type="button"
                            className="jrpg-menu-btn"
                            aria-label="Battle menu"
                            onClick={() => setMenuOpen((value) => !value)}
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                        {menuOpen ? (
                            <div className="jrpg-menu">
                                <button
                                    type="button"
                                    className="pixel-btn pixel-btn--danger"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onFlee();
                                    }}
                                >
                                    🏃 Huir
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ---- the tilted arena ------------------------------------ */}
            <div className="jrpg-arena">
                <div className="jrpg-backdrop-wall" />
                <div className="jrpg-ember" style={{ left: '15%', animationDelay: '0s' }} />
                <div className="jrpg-ember" style={{ left: '45%', animationDelay: '2.2s' }} />
                <div className="jrpg-ember" style={{ left: '78%', animationDelay: '4.1s' }} />

                <TurnOrderStrip
                    chips={[...allies, ...enemies].map((entry) => ({
                        id: entry.id,
                        enemy: enemies.some((enemy) => enemy.id === entry.id),
                    }))}
                    activeId={activeId}
                />

                <div className="jrpg-ground">
                    <div className="jrpg-skirmish-line" />
                </div>

                <div className="jrpg-sprites-layer">
                    {actorSpot ? (
                        <div
                            className="jrpg-active-tile jrpg-active-tile--actor"
                            style={{ left: actorSpot.x, top: actorSpot.y }}
                        />
                    ) : null}
                    {renderSide('ally', allies)}
                    {renderSide('enemy', enemies)}
                </div>

                <div className="jrpg-arena-vignette" />
            </div>

            {/* ---- the bottom panel: commands, skills or targets ---- */}
            {activeId && skillsOpen ? (
                // The character's skill list: every skill the prompt
                // offers, with its cost and stat-change tooltip. Skills
                // the fighter cannot pay stay visible but disabled.
                <OptionsBar
                    size="lg"
                    back={{ label: 'Cancel', onClick: () => setSkillsOpen(false) }}
                    options={skills.map((spec) => {
                        const cost = spec.manaCost ?? 0;
                        const affordable = cost <= (actor?.stats.mana ?? 0);
                        return {
                            id: spec.id,
                            label: spec.name,
                            icon: { symbol: 'auto_awesome', color: '#fff' },
                            accent: '#3b82f6',
                            sub: cost > 0 ? `${cost} MANA` : 'Free',
                            tip: skillEffectSummary(spec),
                            disabled: !affordable,
                            disabledReason: `Needs ${cost} MANA`,
                            onClick: () => chooseSkill(spec),
                        };
                    })}
                />
            ) : activeId && attacking && targetPool.length > 0 ? (
                selection[0] ? (
                    // Phase 2 — a target is picked: the forecast (the
                    // .cf-root HIT gauge) above the tray, the matchup
                    // cards in places 1+2, cancel 5, green accept 6.
                    <>
                        {forecast ? <CombatForecast attack={forecast} /> : null}
                        <TargetBar
                            size="lg"
                            targets={[]}
                            rules={rules}
                            selection={selection}
                            forecast={actor && forecastTarget ? {
                                attacker: combatantOf(actor),
                                defender: combatantOf(forecastTarget),
                                defenderIsEnemy: enemies.some(
                                    (entry) => entry.id === forecastTarget.id,
                                ),
                            } : undefined}
                            onToggle={(id) => setSelection([id])}
                            onAccept={commitSelection}
                            onCancel={cancelTargeting}
                        />
                    </>
                ) : (
                    // Phase 1 — pick a target: only the target list and
                    // the cancel option. Tapping a target (cell or
                    // arena sprite) moves to phase 2.
                    <TargetBar
                        size="lg"
                        targets={targetPool}
                        rules={rules}
                        selection={selection}
                        onToggle={(id) => setSelection([id])}
                        onAccept={commitSelection}
                        onCancel={cancelTargeting}
                    />
                )
            ) : (
                <OptionsBar
                    size="lg"
                    fixedRows
                    options={[
                        {
                            id: 'attack',
                            label: 'Attack',
                            icon: { symbol: 'swords', color: '#fff' },
                            accent: '#dc2626',
                            sub: activeId ? 'Pick target' : '—',
                            disabled: !activeId,
                            disabledReason: 'Wait for your turn',
                            onClick: () => {
                                setPendingSkillId(null);
                                setSelection([]);
                                setAttacking(true);
                            },
                        },
                        {
                            id: 'skill',
                            label: 'Skills',
                            icon: { symbol: 'auto_awesome', color: '#fff' },
                            accent: '#3b82f6',
                            sub: skills.length > 0 ? `${skills.length} skill${skills.length > 1 ? 's' : ''}` : '—',
                            disabled: skills.length === 0,
                            disabledReason: 'No skills available',
                            onClick: () => setSkillsOpen(true),
                        },
                        {
                            id: 'defend',
                            label: 'Defend',
                            icon: { symbol: 'shield', color: '#fff' },
                            accent: '#d4af37',
                            sub: '-70% DMG',
                            disabled: !(skillIds ?? []).some((id) => id === 'defend'),
                            disabledReason: 'No defend skill',
                            onClick: () => onSkill('defend'),
                        },
                    ]}
                />
            )}

            {/* The shared status tooltip overlay: rendered at the arena
                level, outside every tier-scaled entity, so it shares
                the exact .ui-tooltip look of the action buttons. */}
            {chipTip ? (
                <div
                    className="ui-tooltip ui-tooltip--shown"
                    style={{
                        left: chipTip.x,
                        top: chipTip.y,
                        bottom: 'auto',
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    {chipTip.text}
                </div>
            ) : null}
        </div>
    );
}
