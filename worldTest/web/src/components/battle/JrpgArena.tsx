import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Character } from '@rpg';
import { heldJobOf, specOf, skillEffectSummary, canAffordSkill, skillCostLabel, skillUnavailableReason, intervalFromSpeed } from '@core';
import type { SkillSpec } from '@core';
import { SPRITES, spriteRoleOf, animationMsOf } from '../../assets/sprites';
import type { SpriteAnimation, SpriteSet } from '../../assets/sprites';
import { OptionsBar } from '../chrome/OptionsBar';
import type { OptionSpec } from '../chrome/OptionsBar';
import { TargetBar } from '../chrome/TargetBar';
import { StatusChips } from './StatusChips';
import { CombatForecast, previewAttack, previewSkillAttack } from './CombatForecast';
import type { ForecastCombatant } from './CombatForecast';
import { selectionRulesOf, toggleTarget } from '../../game/targeting';
import { STAT_CATALOG } from '../../game/statCatalog';
import type { StatKey } from '../../game/statCatalog';
import { Icon } from '../chrome/Icon';
import { StatBar } from '../chrome/StatBar';

/**
 * The JRPG pseudo-3D tactical arena (the small-battle view, per the
 * design-stitch code_fight reference): a tilted FFTA2-grid floor with
 * three depth tiers for the combatant sprites, micro hp bars, the
 * active-turn cursor and tile, the turn-order chip strip, the active
 * unit banner and the 2x2 command tray. Pure presentation — the
 * CombatScreen keeps owning the hybrid engine.
 */

type DepthTier = 'front' | 'center' | 'back';

// The party sheet order (the grid fills row by row): the STAT_CATALOG
// keys arranged so each row pairs two stats that read naturally
// together — attack next to magic, the two defences, speed next to
// crit. Reorder this list to change the sheet.
const PARTY_STAT_ORDER: StatKey[] = [
    'attack', 'magic',
    'defence', 'magicDefence',
    'speed', 'critChance',
    'critMultiplier',
];

// The visible ground band the columns may occupy: the tilted floor's
// projected top and bottom edges, in arena coordinates. Sections never
// rise above its top — when a column needs more room than the band
// provides, its fighters shrink (and their spacing with them) so the
// section stays on the ground.
const GROUND_TOP = 174;
const GROUND_BOTTOM = 364;
const GROUND_CENTER = (GROUND_TOP + GROUND_BOTTOM) / 2;
// The sprite footprint of a column: from the top of the tallest
// sprite to the feet, plus a small margin.
const COLUMN_FOOTPRINT = 60;
// A column holds at most this many fighters: the overflow forms a
// second column behind the first (and a third behind that...).
const COLUMN_MAX = 4;
// The x offset of each overflow column, toward the side's back edge
// (allies left, enemies right).
const OVERFLOW_OFFSET = 28;

// The three depth COLUMNS: each tier is a straight vertical column of
// fighters, one x per column, all centered on the ground band. Every
// tier renders its sprites at the SAME size for now (the CSS depth
// scales are all 1×) — only the brightness tiers differ. Extra
// fighters spread vertically around the column's center, evenly spaced
// (`spacing`), and the column's x stays fixed.
const TIERS: Record<DepthTier, {
    cls: string;
    ally: { x: number };
    enemy: { x: number };
    spacing: number;
}> = {
    back: { cls: 'jrpg-depth-far', ally: { x: 40 }, enemy: { x: 280 }, spacing: 34 },
    center: { cls: 'jrpg-depth-mid', ally: { x: 88 }, enemy: { x: 232 }, spacing: 40 },
    front: { cls: 'jrpg-depth-front', ally: { x: 132 }, enemy: { x: 188 }, spacing: 48 },
};

function tierOf(character: Character): DepthTier {
    if (character.position === 'back') return 'back';
    if (character.position === 'center') return 'center';
    return 'front';
}

// Which side the pending action may pick targets on: a plain attack
// picks enemies, a skill picks by its targeting (ENEMY/ALLY/ANY), and
// SELF picks nobody — its target is the caster and never changes.
function pickableSideOf(spec: SkillSpec | undefined): 'enemy' | 'ally' | 'any' | 'none' {
    if (!spec) return 'enemy';
    if (spec.targeting === 'ENEMY') return 'enemy';
    if (spec.targeting === 'ALLY') return 'ally';
    if (spec.targeting === 'ANY') return 'any';
    return 'none';
}

// The fit of one depth column inside the ground band: when the
// column's natural height (spacing × (count − 1) + the sprite
// footprint) exceeds the band, the SPACING shrinks so the section
// stays on the ground (the sprites themselves never drop below their
// 24px render size — the CSS floors the total scale at 1.5).
function columnFitOf(tier: DepthTier, count: number): { spacing: number; shrink: number } {
    const spacing = TIERS[tier].spacing;
    const needed = Math.max(1, (count - 1) * spacing + COLUMN_FOOTPRINT);
    const available = GROUND_BOTTOM - GROUND_TOP;
    const shrink = Math.min(1, available / needed);
    return { spacing: spacing * shrink, shrink };
}

// The arena spot (the feet anchor) of a combatant: the tier's column
// x (overflow columns sit behind it, offset toward the side's back),
// with the fighter vertically spaced around the ground band's center —
// index 0 is the topmost spot, the last index the bottommost. `shrink`
// is the section's collapse factor (the sprites scale by it).
function positionOf(
    tier: DepthTier,
    side: 'ally' | 'enemy',
    index: number,
    count: number,
    column = 0,
): { x: number; y: number; shrink: number } {
    const base = TIERS[tier][side].x;
    const direction = side === 'ally' ? -1 : 1;
    const fit = columnFitOf(tier, count);
    const offset = (index - (count - 1) / 2) * fit.spacing;
    return { x: base + direction * column * OVERFLOW_OFFSET, y: GROUND_CENTER + offset, shrink: fit.shrink };
}

/** One combatant entity anchored in the tilted arena. */
function ArenaEntity({
    character,
    side,
    tier,
    index,
    count,
    column,
    active,
    targeted,
    inspected,
    acting,
    actingNonce,
    onClick,
    onTip,
}: {
    character: Character;
    side: 'ally' | 'enemy';
    tier: DepthTier;
    index: number;
    count: number;
    column: number;
    active?: boolean;
    targeted?: boolean;
    inspected?: boolean;
    // The entity acts right now: it plays its attack pose once per
    // nonce change, then returns to the idle sheet.
    acting?: boolean;
    actingNonce?: number;
    onClick?: () => void;
    // Forwarded to the status chips: the arena owns the tooltip overlay.
    onTip?: (tip: { text: string; anchor: Element } | null) => void;
}) {
    const { x, y, shrink } = positionOf(tier, side, index, count, column);

    const hp = Math.round(character.stats.hp);
    const maxHp = Math.round(character.stats.totalHp);
    const mana = Math.round(character.stats.mana ?? 0);
    const totalMana = Math.round(character.stats.totalMana ?? 0);
    const sheet: SpriteSet = SPRITES[spriteRoleOf(character) ?? 'warrior'];

    // The attack pose: one-shot over the attack sheet, back to idle
    // when the animation's total time elapses.
    const [posing, setPosing] = useState(false);
    useEffect(() => {
        if (!acting) {
            setPosing(false);
            return;
        }
        setPosing(true);
        const timer = window.setTimeout(() => setPosing(false), animationMsOf(sheet.attack));
        return () => window.clearTimeout(timer);
    }, [acting, actingNonce, sheet]);

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
            style={{ 'left': x, 'top': y, '--jrpg-shrink': shrink } as CSSProperties}
            onClick={onClick}
        >
            {active ? <span className="jrpg-cursor-arrow" /> : null}
            {targeted ? <span className="jrpg-target-arrow" /> : null}
            <StatusChips character={character} onTip={onTip} />
            <span className="jrpg-entity-shadow" />
            <span className="jrpg-entity-bars">
                <StatBar
                    value={hp}
                    max={maxHp}
                    type={side === 'enemy' ? 'enemy-hp' : 'hp'}
                    width={16}
                    height={1}
                />
                <StatBar value={mana} max={totalMana} type="mana" width={16} height={1} />
            </span>
            <span
                className={`jrpg-sprite-box${posing ? ' jrpg-sprite-box--attack' : ''}`}
                style={posing ? {
                    'backgroundImage': `url(${sheet.attack.sheet})`,
                    '--attack-frames': sheet.attack.frames,
                    '--attack-ms': `${animationMsOf(sheet.attack)}ms`,
                } as CSSProperties : { backgroundImage: `url(${sheet.idle.sheet})` }}
            />
        </div>
    );
}

/** One battle effect sprite (the physical slash, the magical blast):
 *  steps through its frames at frameMs and reports when the last
 *  frame played. */
function EffectPlayer({
    animation,
    x,
    y,
    onDone,
}: {
    animation: SpriteAnimation;
    x: number;
    y: number;
    onDone: () => void;
}) {
    const [frame, setFrame] = useState(0);
    const frameRef = useRef(0);
    const doneRef = useRef(onDone);
    doneRef.current = onDone;
    useEffect(() => {
        frameRef.current = 0;
        setFrame(0);
        const timer = window.setInterval(() => {
            frameRef.current += 1;
            if (frameRef.current >= animation.frames) {
                window.clearInterval(timer);
                doneRef.current();
                return;
            }
            setFrame(frameRef.current);
        }, animation.frameMs);
        return () => window.clearInterval(timer);
    }, [animation]);
    return (
        <span
            className="jrpg-effect"
            style={{
                'left': x,
                'top': y,
                'width': animation.frameWidth,
                'height': animation.frameHeight,
                'backgroundImage': `url(${animation.sheet})`,
                'backgroundSize': `${animation.frameWidth * animation.frames}px ${animation.frameHeight}px`,
                'backgroundPosition': `${-frame * animation.frameWidth}px 0`,
            }}
        />
    );
}

/** The turn-order chip strip: the next fighters by their speed order,
 *  current first, each chip showing the fighter's sprite. */
function TurnOrderStrip({
    chips,
    activeId,
}: {
    chips: { id: string; enemy: boolean; name?: string; sprite?: string }[];
    activeId?: string;
}) {
    return (
        <div className="jrpg-turn-order-strip">
            {chips.slice(0, 10).map((chip, index) => (
                <span
                    key={`${chip.id}-${index}`}
                    title={chip.name}
                    className={[
                        'jrpg-order-chip',
                        chip.enemy ? 'jrpg-order-chip--enemy' : '',
                        chip.id === activeId ? 'jrpg-order-chip--current' : '',
                    ].join(' ')}
                    style={chip.sprite ? { backgroundImage: `url(${chip.sprite})` } : undefined}
                />
            ))}
        </div>
    );
}

export function JrpgArena({
    allies,
    enemies,
    activeId,
    manualTurn,
    order,
    inspectedId,
    skillIds,
    targets,
    extraOptions,
    showSections,
    effects,
    onEffectDone,
    acting,
    onTarget,
    onInspect,
    onSkill,
    onFlee,
}: {
    allies: Character[];
    enemies: Character[];
    // The actor acting right now (the manual prompt or an auto turn).
    activeId?: string;
    // Whether the current actor waits for the player: during automatic
    // turns the command bar stays visible but locked.
    manualTurn?: boolean;
    // The Pokémon-style round queue (current fighter first), shown by
    // the .jrpg-turn-order-strip.
    order?: { id: string; enemy: boolean }[];
    // The combatant the player tapped for inspection.
    inspectedId?: string;
    // The actor's skill ids (the manual prompt's skills).
    skillIds?: string[];
    // The enemies the actor may attack (the manual prompt's targets).
    targets: { id: string; label: string }[];
    // Extra options appended to the default command tray (Attack +
    // Skills) — the dev battle page enriches the tray through these.
    extraOptions?: OptionSpec[];
    // The debug sections overlay: translucent colored boxes over each
    // depth tier and side (the dev battle page shows them to check
    // where the current formation places its fighters).
    showSections?: boolean;
    // One-shot battle effects played over a target (the physical slash
    // or the magical blast); the arena positions them at the target's
    // arena spot and reports when each finishes.
    effects?: { id: string; targetId: string; animation: SpriteAnimation }[];
    onEffectDone?: (id: string) => void;
    // The acting fighter (its entity plays the attack pose one-shot per
    // nonce change).
    acting?: { actorId: string; nonce: number } | null;
    onTarget: (id: string) => void;
    onInspect: (id: string) => void;
    // Cast a skill; the optional targetIds are the player's picks for
    // single or multi-target skills (SELF and whole-side skills need
    // none).
    onSkill: (skillId: string, targetIds?: string | string[]) => void;
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
    // The party panel (the menu's Party entry): the roster list plus the
    // selected member's full stat sheet, for checking the turn order.
    const [partyOpen, setPartyOpen] = useState(false);
    const [partySelectedId, setPartySelectedId] = useState<string | undefined>(undefined);
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

    // ---- the arena camera ---------------------------------------------
    // The view adapts to the fighter count: crowded battles shrink the
    // sprites, and the camera zooms out to fit the whole formation (a
    // CSS-transform camera over the DOM — no canvas, so targeting,
    // tooltips and animations keep working).
    const total = allies.length + enemies.length;
    const unitScale = Math.max(0.72, 1 - Math.max(0, total - 4) * 0.05);

    const arenaRef = useRef<HTMLDivElement | null>(null);
    const [arenaSize, setArenaSize] = useState({ w: 320, h: 320 });
    useLayoutEffect(() => {
        const node = arenaRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        setArenaSize((prev) =>
            Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5 ?
                prev :
                { w: rect.width, h: rect.height });
    });

    // ---- the arena entities -------------------------------------------
    // One placement per combatant: everyone keeps their position tier
    // (the acting unit no longer steps to the frontline — the turn
    // cursor and the floor tile mark whose turn it is). Each tier is
    // chunked into COLUMN_MAX-sized columns (the overflow forms
    // further columns behind), and each placement knows its column
    // index and size, shared by the entities, the active tile, the
    // sections overlay and the camera so they always align.
    const placementsOf = (side: 'ally' | 'enemy', pool: Character[]) => {
        const byTier = new Map<DepthTier, Character[]>();
        for (const character of pool) {
            const tier: DepthTier = tierOf(character);
            const list = byTier.get(tier) ?? [];
            list.push(character);
            byTier.set(tier, list);
        }
        const placements: {
            character: Character;
            side: 'ally' | 'enemy';
            tier: DepthTier;
            index: number;
            count: number;
            column: number;
        }[] = [];
        for (const tier of ['back', 'center', 'front'] as DepthTier[]) {
            const list = byTier.get(tier) ?? [];
            for (let start = 0; start < list.length; start += COLUMN_MAX) {
                const chunk = list.slice(start, start + COLUMN_MAX);
                const column = start / COLUMN_MAX;
                chunk.forEach((character, index) => {
                    placements.push({ character, side, tier, index, count: chunk.length, column });
                });
            }
        }
        return placements;
    };

    const allySpots = placementsOf('ally', allies);
    const enemySpots = placementsOf('enemy', enemies);

    // ---- the debug sections overlay -------------------------------
    // One translucent box per depth tier, side and column, covering
    // where the current formation stacks its fighters. The dev battle
    // page shows them to check the layout.
    const sectionBoxes = (spots: typeof allySpots, side: 'ally' | 'enemy') => {
        const boxes: {
            side: 'ally' | 'enemy';
            tier: DepthTier;
            column: number;
            x: number;
            y: number;
            w: number;
            h: number;
        }[] = [];
        for (const tier of ['front', 'center', 'back'] as DepthTier[]) {
            const inTier = spots.filter((entry) => entry.tier === tier);
            const byColumn = new Map<number, typeof inTier>();
            for (const entry of inTier) {
                const list = byColumn.get(entry.column) ?? [];
                list.push(entry);
                byColumn.set(entry.column, list);
            }
            for (const [column, list] of byColumn) {
                const top = positionOf(tier, side, 0, list.length, column);
                const bottom = positionOf(tier, side, list.length - 1, list.length, column);
                // The sprite footprint, scaled by the section's collapse
                // factor: ~40px to each side of the feet and ~52px up.
                const padX = 40 * top.shrink;
                const padTop = 52 * top.shrink;
                const padBottom = 8 * top.shrink;
                boxes.push({
                    side,
                    tier,
                    column,
                    x: top.x - padX,
                    y: top.y - padTop,
                    w: 2 * padX,
                    h: bottom.y - top.y + padTop + padBottom,
                });
            }
        }
        return boxes;
    };

    const renderSide = (side: 'ally' | 'enemy', spots: typeof allySpots) => {
        return spots.map(({ character, tier, index, count, column }) => {
            // In target mode, tapping a valid target selects it (the
            // cards and the forecast follow); any other tap inspects.
            // The pickable side comes from the CURRENT action: plain
            // attacks and ENEMY skills pick enemies, ALLY skills pick
            // allies, ANY skills both — SELF skills pick nobody (the
            // caster is the fixed target).
            const pickableSide = pickableSideOf(pendingSpec);
            const pickable = attacking && (
                pickableSide === 'any' ||
                (side === 'enemy' && pickableSide === 'enemy') ||
                (side === 'ally' && pickableSide === 'ally'));
            const onClick = attacking ?
                () => {
                    if (!pickable) {
                        onInspect(character.id);
                        return;
                    }
                    if (pendingSkillId && !skillHasPreview) {
                        // Nothing to confirm: the tap casts the skill
                        // directly on this fighter.
                        onSkill(pendingSkillId, character.id);
                        setAttacking(false);
                        setSkillsOpen(false);
                        setPendingSkillId(null);
                        setSelection([]);
                        return;
                    }
                    // Multi-target picks accumulate (toggle); single-
                    // target picks replace.
                    setSelection(pickCount > 1 ?
                        toggleTarget(selection, character.id, rules) :
                        [character.id]);
                } :
                () => onInspect(character.id);
            return (
                <ArenaEntity
                    key={character.id}
                    character={character}
                    side={side}
                    tier={tier}
                    index={index}
                    count={count}
                    column={column}
                    active={character.id === activeId}
                    targeted={attacking && selection.includes(character.id)}
                    inspected={character.id === inspectedId}
                    acting={acting ? character.id === acting.actorId : false}
                    actingNonce={acting?.nonce}
                    onClick={onClick}
                    onTip={showChipTip}
                />
            );
        });
    };

    // The tile under the acting unit's feet: its real arena spot (the
    // column spacing included), so the marker never drifts off the
    // sprite.
    const actorPlacement = activeId ?
        allySpots.find((entry) => entry.character.id === activeId) :
        undefined;
    const actorSpot = actorPlacement ?
        positionOf(actorPlacement.tier, 'ally', actorPlacement.index, actorPlacement.count, actorPlacement.column) :
        undefined;

    // The camera: zoom out until the whole formation (feet anchors
    // plus the sprite margins) fits the arena box, centered on it.
    // Zoom-out only: small battles keep the native scale.
    const camera = (() => {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const spot of allySpots.concat(enemySpots)) {
            const { x, y } = positionOf(spot.tier, spot.side, spot.index, spot.count, spot.column);
            minX = Math.min(minX, x - 30);
            maxX = Math.max(maxX, x + 30);
            minY = Math.min(minY, y - 34);
            maxY = Math.max(maxY, y + 6);
        }
        const bboxW = Math.max(1, maxX - minX);
        const bboxH = Math.max(1, maxY - minY);
        const fit = Math.min(arenaSize.w / bboxW, arenaSize.h / bboxH);
        const scale = Math.min(1, Math.max(0.7, fit));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        return {
            scale,
            tx: arenaSize.w / 2 - cx * scale,
            ty: arenaSize.h / 2 - cy * scale,
        };
    })();

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
    const bannerSprite = bannerCharacter ?
        SPRITES[spriteRoleOf(bannerCharacter) ?? 'warrior'].idle.sheet :
        undefined;
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
    // damage (or the skill's healing / status changes) against the
    // selected target — only shown once one is picked.
    const actor = allies.find((entry) => entry.id === activeId);
    const forecastTarget = selection[0] ?
        allies.concat(enemies).find((entry) => entry.id === selection[0]) :
        undefined;
    const forecast = actor && forecastTarget ?
        pendingSpec ?
            previewSkillAttack(pendingSpec, actor, forecastTarget) :
            previewAttack(actor, forecastTarget) :
        undefined;
    // Whether the pending skill has anything to confirm: damage,
    // healing or status changes. Without one, the target pick casts
    // directly (no confirmation screen).
    const skillHasPreview = Boolean(pendingSpec && actor &&
        previewSkillAttack(pendingSpec, actor, actor));
    // The pick count of the pending skill (1 = single target, 2 = two
    // distinct targets...): drives the selection rules and the phase
    // switch (multi-target picks stay in phase 1 until complete).
    const pickCount = Math.max(1, pendingSpec?.numberOfTargets ?? 1);
    const rules = selectionRulesOf({ targeting: 'ENEMY', count: pickCount, poolSize: targetPool.length });

    const combatantOf = (character: Character): ForecastCombatant => ({
        name: character.name,
        level: character.experience.level,
        hp: Math.round(character.stats.hp),
        maxHp: Math.round(character.stats.totalHp),
        mana: Math.round(character.stats.mana ?? 0),
        maxMana: Math.round(character.stats.totalMana ?? 0),
    });

    // Commit the picked targets (the attack or the pending skill) and
    // leave target mode; cancel steps back: with a target picked it
    // returns to the target list, otherwise it aborts the whole pick.
    const commitSelection = () => {
        if (!selection[0]) return;
        if (pendingSkillId) {
            // SELF skills commit without a target: the actor IS the
            // target the confirmation screen showed. Multi-target
            // skills commit their whole selection.
            if (pendingSpec?.targeting === 'SELF') {
                onSkill(pendingSkillId);
            } else {
                onSkill(pendingSkillId, selection);
            }
        } else {
            onTarget(selection[0]);
        }
        setAttacking(false);
        setSkillsOpen(false);
        setPendingSkillId(null);
        setSelection([]);
    };
    const cancelTargeting = () => {
        if (selection[0] && pendingSpec?.targeting !== 'SELF') {
            // Back to the target selection (phase 2 -> phase 1).
            setSelection([]);
            return;
        }
        // Self skills have no target list to return to: abort the pick.
        setAttacking(false);
        setSkillsOpen(false);
        setPendingSkillId(null);
        setSelection([]);
    };

    // Picking a skill from the list: whole-side skills cast immediately;
    // single-target skills move to the target pick; SELF skills with
    // something to confirm (damage, healing, status changes) open the
    // confirmation screen against the caster, the rest cast instantly.
    const chooseSkill = (spec: SkillSpec) => {
        setSkillsOpen(false);
        if (spec.targeting === 'ALL_ENEMIES' ||
            spec.targeting === 'ALL_ALLIES') {
            onSkill(spec.id);
            return;
        }
        const caster = allies.find((entry) => entry.id === activeId);
        const confirmable = caster ?
            previewSkillAttack(spec, caster, caster) !== undefined :
            false;
        if (spec.targeting === 'SELF') {
            if (!confirmable) {
                onSkill(spec.id);
                return;
            }
            setPendingSkillId(spec.id);
            setSelection(caster ? [caster.id] : []);
            setAttacking(true);
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
            <div
                className="jrpg-arena"
                ref={arenaRef}
                style={{ '--jrpg-unit-scale': unitScale } as CSSProperties}
            >
                <div
                    className="jrpg-camera"

                >
                    <div className="jrpg-backdrop-wall" />
                    <div className="jrpg-ember" style={{ left: '15%', animationDelay: '0s' }} />
                    <div className="jrpg-ember" style={{ left: '45%', animationDelay: '2.2s' }} />
                    <div className="jrpg-ember" style={{ left: '78%', animationDelay: '4.1s' }} />

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
                        {renderSide('ally', allySpots)}
                        {renderSide('enemy', enemySpots)}
                    </div>

                    {/* ---- the battle effects: one-shot sprites over
                        their target's arena spot ---- */}
                    {(effects ?? []).length > 0 ? (
                        <div className="jrpg-effects-layer">
                            {(effects ?? []).map((effect) => {
                                const placement = allySpots.concat(enemySpots)
                                    .find((spot) => spot.character.id === effect.targetId);
                                if (!placement) return null;
                                const spot = positionOf(
                                    placement.tier,
                                    placement.side,
                                    placement.index,
                                    placement.count,
                                    placement.column,
                                );
                                return (
                                    <EffectPlayer
                                        key={effect.id}
                                        animation={effect.animation}
                                        x={spot.x - effect.animation.frameWidth / 2}
                                        y={spot.y - effect.animation.frameHeight}
                                        onDone={() => onEffectDone?.(effect.id)}
                                    />
                                );
                            })}
                        </div>
                    ) : null}

                    {showSections ? (
                        <div className="jrpg-sections-layer">
                            {[...sectionBoxes(allySpots, 'ally'), ...sectionBoxes(enemySpots, 'enemy')].map((box) => (
                                <div
                                    key={`${box.side}-${box.tier}-${box.column}`}
                                    className={`jrpg-section jrpg-section--${box.tier}`}
                                    style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                                >
                                    <span className="jrpg-section-label">
                                        {box.side} {box.tier}{box.column > 0 ? ` ·${box.column + 1}` : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                <TurnOrderStrip
                    chips={(order ?? [...allies, ...enemies].map((entry) => ({
                        id: entry.id,
                        enemy: enemies.some((enemy) => enemy.id === entry.id),
                    }))).map((entry) => {
                        const character = allies.concat(enemies)
                            .find((candidate) => candidate.id === entry.id);
                        return {
                            ...entry,
                            name: character?.name ?? entry.id,
                            sprite: character ?
                                SPRITES[spriteRoleOf(character) ?? 'warrior'].idle.sheet :
                                undefined,
                        };
                    })
                        // Sprite-only: chips without a picture (no
                        // matching fighter) are dropped, never numbered.
                        .filter((entry) => entry.sprite)}
                    activeId={order?.[0]?.id ?? activeId}
                />

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
                        const usable = actor ? canAffordSkill(spec, actor) : false;
                        return {
                            id: spec.id,
                            label: spec.name,
                            icon: { symbol: 'auto_awesome', color: '#fff' },
                            accent: '#3b82f6',
                            sub: skillCostLabel(spec),
                            tip: skillEffectSummary(spec),
                            disabled: !usable,
                            disabledReason: actor ? skillUnavailableReason(spec, actor) : 'Wait for your turn',
                            onClick: () => chooseSkill(spec),
                        };
                    })}
                />
            ) : activeId && attacking && (targetPool.length > 0 || pendingSpec?.targeting === 'SELF') ? (
                selection.length >= pickCount && selection[0] ? (
                    // Phase 2 — a target is picked: the forecast (the
                    // .cf-root HIT gauge, with the damage, healing or
                    // status changes) above the tray, the matchup
                    // cards in places 1+2, cancel 5, green accept 6.
                    <>
                        {forecast ? <CombatForecast attack={forecast} /> : null}
                        <TargetBar
                            size="lg"
                            targets={[]}
                            rules={rules}
                            selection={selection}
                            cancelLabel="Back"
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
                    // the cancel option. Tapping a target moves to the
                    // confirmation (phase 2) — unless the skill has
                    // nothing to confirm, then the tap casts directly.
                    <TargetBar
                        size="lg"
                        targets={targetPool}
                        rules={rules}
                        selection={selection}
                        onToggle={(id) => {
                            if (pendingSkillId && !skillHasPreview) {
                                onSkill(pendingSkillId, id);
                                setAttacking(false);
                                setSkillsOpen(false);
                                setPendingSkillId(null);
                                setSelection([]);
                                return;
                            }
                            // Multi-target picks accumulate (toggle);
                            // single-target picks replace.
                            setSelection(pickCount > 1 ?
                                toggleTarget(selection, id, rules) :
                                [id]);
                        }}
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
                            disabled: !activeId || !manualTurn,
                            disabledReason: !manualTurn ? 'Enemy turn' : 'Wait for your turn',
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
                            disabled: skills.length === 0 || !activeId || !manualTurn,
                            disabledReason: skills.length === 0 ?
                                'No skills available' :
                                !manualTurn ? 'Enemy turn' : 'Wait for your turn',
                            onClick: () => setSkillsOpen(true),
                        },
                        {
                            id: 'party',
                            label: 'Party',
                            icon: { symbol: 'groups', color: '#fff' },
                            accent: '#f2ca50',
                            sub: 'Roster & stats',
                            onClick: () => {
                                setPartySelectedId(allies[0]?.id);
                                setPartyOpen(true);
                            },
                        },
                        ...(extraOptions ?? []),
                    ]}
                />
            )}

            {/* ---- the party panel: roster + the selected member's stats ---- */}
            {partyOpen ? (
                (() => {
                    const selected = allies.find((entry) => entry.id === partySelectedId) ?? allies[0];
                    // The selected member's sheet: the shared STAT_CATALOG
                    // constant (same icons, curated labels and value
                    // formatting as the character stats page) in the
                    // PARTY_STAT_ORDER arrangement, integers only.
                    const statRows = PARTY_STAT_ORDER
                        .map((key) => STAT_CATALOG.find((entry) => entry.key === key))
                        .filter((entry): entry is typeof STAT_CATALOG[number] => Boolean(entry))
                        .map((entry) => ({
                            key: entry.key,
                            icon: entry.icon,
                            label: entry.label,
                            value: `${entry.prefix ?? ''}${Math.round(selected ? selected.getStat(entry.key) : 0)}${entry.suffix ?? ''}`,
                        }));
                    return (
                        <div className="jrpg-party-panel">
                            <div className="jrpg-party-head">
                                <span className="jrpg-party-title">PARTY</span>
                                <button
                                    type="button"
                                    className="pixel-btn jrpg-party-close"
                                    onClick={() => setPartyOpen(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="jrpg-party-list">
                                {allies.map((ally) => {
                                    const isSelected = selected?.id === ally.id;
                                    // The member's place in the round queue
                                    // (the strip shows the same order).
                                    const queueIndex = order ?
                                        order.findIndex((entry) => entry.id === ally.id) :
                                        -1;
                                    return (
                                        <button
                                            key={ally.id}
                                            type="button"
                                            className={`jrpg-party-row${isSelected ? ' jrpg-party-row--selected' : ''}`}
                                            onClick={() => setPartySelectedId(ally.id)}
                                        >
                                            <span className="jrpg-party-name">{ally.name}</span>
                                            <span className="jrpg-party-meta">
                                                LV {ally.experience.level} · {heldJobOf(ally)?.title ?? ''}
                                            </span>
                                            <span className="jrpg-party-vitals">
                                                HP {Math.round(ally.stats.hp)}/{Math.round(ally.stats.totalHp)}
                                                {' · '}MANA {Math.round(ally.stats.mana ?? 0)}/{Math.round(ally.stats.totalMana ?? 0)}
                                            </span>
                                            <span className="jrpg-party-speed">
                                                SPD {Math.round(ally.getStat('speed'))}
                                                {' · '}interval {intervalFromSpeed(ally.getStat('speed'))}
                                                {queueIndex !== -1 ? ` · queue #${queueIndex + 1}` : ''}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {selected ? (
                                <div className="jrpg-party-stats">
                                    <div className="jrpg-party-stats-title">{selected.name}</div>
                                    <div className="jrpg-party-stats-grid">
                                        {statRows.map((row) => (
                                            <span key={row.key} className="jrpg-party-stat">
                                                <span className="jrpg-party-stat-icon">
                                                    <Icon id={row.icon} size={3} />
                                                </span>
                                                <span className="jrpg-party-stat-label">{row.label}</span>
                                                <span className="jrpg-party-stat-value">{row.value}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })()
            ) : null}

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
