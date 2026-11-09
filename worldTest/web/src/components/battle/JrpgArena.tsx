import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '@rpg';
import { heldJobOf, passiveSkillIdsOf, specOf, skillEffectSummary, canAffordSkill, skillCostLabel, skillUnavailableReason, intervalFromSpeed } from '@core';
import type { SkillSpec } from '@core';
import { SPRITES, spriteRoleOf } from '../../assets/sprites';
import type { SpriteAnimation, SpriteSet } from '../../assets/sprites';
import { spriteBoxStyle, spriteFrameStyle, spriteScaleFor } from '../../assets/spriteFrames';
import type { BattleEffect } from '../../assets/effects';
import { OptionsBar } from '../chrome/OptionsBar';
import type { OptionSpec } from '../chrome/OptionsBar';
import { TargetBar } from '../chrome/TargetBar';
import { StatusChips } from './StatusChips';
import { CombatForecast, previewAttack, previewSkillAttack } from './CombatForecast';
import type { ForecastCombatant } from './CombatForecast';
import { selectionRulesOf, toggleTarget } from '../../game/targeting';
import { STAT_CATALOG } from '../../game/statCatalog';
import type { StatKey } from '../../game/statCatalog';
import { DEFAULT_GROUND_BAND, layoutFormation, spriteBoxFor } from '../../game/formation';
import type { FormationPlacement, FormationSide, GroundBand } from '../../game/formation';
import { Icon } from '../chrome/Icon';
import { StatBar } from '../chrome/StatBar';
import './JrpgArena.css';

/**
 * The JRPG pseudo-3D tactical arena (the small-battle view, per the
 * design-stitch code_fight reference): a tilted FFTA2-style floor with
 * count-driven formation rows, micro hp bars, the active-turn cursor and
 * tile, the turn-order chip strip, the active unit banner and the 2x2
 * command tray. Pure presentation — the CombatScreen keeps owning the
 * hybrid engine.
 */

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

/** One combatant entity anchored in the tilted arena. */
type ArenaSpot = {
    character: Character;
    side: FormationSide;
    placement: FormationPlacement | undefined;
};

function ArenaEntity({
    character,
    side,
    x,
    y,
    spriteBox,
    active,
    targeted,
    inspected,
    acting,
    actingNonce,
    onClick,
    onTip,
}: {
    character: Character;
    side: FormationSide;
    // The feet anchor and the sprite render box computed by the arena's
    // formation layout.
    x: number;
    y: number;
    spriteBox: number;
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

    const hp = Math.round(character.stats.hp);
    const maxHp = Math.round(character.stats.totalHp);
    const barrier = Math.round(character.vitals.barrier);
    const mana = Math.round(character.stats.mana ?? 0);
    const totalMana = Math.round(character.stats.totalMana ?? 0);
    const sheet: SpriteSet = SPRITES[spriteRoleOf(character) ?? 'warrior'];
    // The attack pose is optional: the new archer/warrior art has only a
    // 2-frame idle, so those roles hold the idle sprite (the hit effect
    // still plays) until an attack sheet is added to the data.
    const attackAnim = sheet.attack;

    // The attack pose: a one-shot over the attack sheet (stepped by JS
    // so frame offsets like the cow's shared sheet work), back to idle
    // when the animation's total time elapses.
    const [posing, setPosing] = useState(false);
    const [poseFrame, setPoseFrame] = useState(0);
    useEffect(() => {
        if (!acting || !attackAnim) {
            setPosing(false);
            return;
        }
        setPosing(true);
        setPoseFrame(0);
        let current = 0;
        const timer = window.setInterval(() => {
            current += 1;
            if (current >= attackAnim.frames) {
                window.clearInterval(timer);
                setPosing(false);
                return;
            }
            setPoseFrame(current);
        }, attackAnim.frameMs);
        return () => window.clearInterval(timer);
    }, [acting, actingNonce, attackAnim]);

    // The idle loop: steps through the idle sheet's frames forever
    // (paused while the attack pose plays). Single-frame idles sit on
    // frame 0.
    const [idleFrame, setIdleFrame] = useState(0);
    useEffect(() => {
        if (posing || sheet.idle.frames <= 1) return;
        const timer = window.setInterval(() => {
            setIdleFrame((prev) => (prev + 1) % sheet.idle.frames);
        }, sheet.idle.frameMs);
        return () => window.clearInterval(timer);
    }, [posing, sheet]);

    // The animation being shown right now: the attack pose while it
    // plays, the idle loop otherwise. Every role renders at the same
    // on-screen box (formation.spriteBoxFor), independent of its native
    // sheet size (16px mage vs 64px archer).
    const spriteAnimation = posing && attackAnim ? attackAnim : sheet.idle;

    return (
        <div
            data-unit-id={character.id}
            className={[
                'jrpg-entity',
                side === 'enemy' ? 'jrpg-enemy-side' : 'jrpg-ally-side',
                active ? 'jrpg-entity--active' : '',
                targeted ? 'jrpg-entity--targeted' : '',
                inspected ? 'jrpg-entity--inspected' : '',
                hp <= 0 ? 'jrpg-entity--dead' : '',
            ].join(' ')}
            style={{
                left: x,
                top: y,
                zIndex: 10 + Math.round(y) + (active || targeted ? 500 : 0),
            }}
            onClick={onClick}
        >
            {active ? <span className="jrpg-cursor-arrow" /> : null}
            {targeted ? <span className="jrpg-target-arrow" /> : null}
            <StatusChips character={character} onTip={onTip} />
            <span className="jrpg-entity-shadow" />
            <span className="jrpg-entity-bars">
                {barrier > 0 ? (
                    <StatBar
                        value={barrier}
                        max={Math.max(barrier, maxHp)}
                        type="barrier"
                        width={16}
                        height={1}
                    />
                ) : null}
                <StatBar
                    value={hp}
                    max={maxHp}
                    type={side === 'enemy' ? 'enemy-hp' : 'hp'}
                    width={16}
                    height={1}
                />
                <StatBar value={mana} max={totalMana} type="mana" width={16} height={1} />
            </span>
            <span className="jrpg-sprite-flip">
                <span
                    className="jrpg-sprite-box"
                    style={{
                        // The element MUST be as big as the scaled frame;
                        // background-size alone gets cropped by the CSS box.
                        ...spriteBoxStyle(spriteAnimation, spriteBox),
                        ...spriteFrameStyle(
                            spriteAnimation,
                            posing && attackAnim ? poseFrame : idleFrame,
                            spriteScaleFor(spriteBox, spriteAnimation),
                        ),
                    }}
                />
            </span>
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
    maxChips = 5,
}: {
    chips: { id: string; enemy: boolean; name?: string; animation?: SpriteAnimation }[];
    activeId?: string;
    maxChips?: number;
}) {
    return (
        <div className="jrpg-turn-order-strip">
            {chips.slice(0, maxChips).map((chip, index) => (
                <span
                    key={`${chip.id}-${index}`}
                    title={chip.name}
                    className={[
                        'jrpg-order-chip',
                        chip.enemy ? 'jrpg-order-chip--enemy' : '',
                        chip.id === activeId ? 'jrpg-order-chip--current' : '',
                    ].join(' ')}
                    style={chip.animation ? {
                        // The chip is a fixed 16px box but the native sheets
                        // differ (16px mage, 64px archer/warrior): scale the
                        // background to the chip instead of cropping it.
                        ...spriteBoxStyle(chip.animation, 16),
                        ...spriteFrameStyle(chip.animation, 0, 16 / chip.animation.frameWidth),
                    } : undefined}
                />
            ))}
        </div>
    );
}

/** The battle menu button: the same button chrome as the app header's
 *  menu, with the fight's options (Huir). It is portaled into the app
 *  header during a story fight; dev screens keep it floating in the
 *  arena. */
function BattleMenuButton({ onFlee }: { onFlee: () => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="jrpg-battle-menu">
            <button
                type="button"
                className="newui-header-menu pixel-btn"
                aria-label="Battle menu"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                <span className="newui-header-menu-bar" />
                <span className="newui-header-menu-bar" />
                <span className="newui-header-menu-bar" />
            </button>
            {open ? (
                <div className="jrpg-menu">
                    <button
                        type="button"
                        className="pixel-btn pixel-btn--danger"
                        onClick={() => {
                            setOpen(false);
                            onFlee();
                        }}
                    >
                        🏃 Huir
                    </button>
                </div>
            ) : null}
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
    effects,
    onEffectDone,
    acting,
    maxOrderChips = 5,
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
    // One-shot battle effects played over a target (the physical slash
    // or the magical blast); the arena positions them at the target's
    // arena spot and reports when each finishes.
    effects?: BattleEffect[];
    onEffectDone?: (id: string) => void;
    // The acting fighter (its entity plays the attack pose one-shot per
    // nonce change).
    acting?: { actorId: string; nonce: number } | null;
    // How many portraits the turn-order strip shows (default 5).
    maxOrderChips?: number;
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

    // ---- the ground band ----------------------------------------------
    // The sprites are placed against the projected footprint of the
    // tilted ground, measured from the DOM. Moving or resizing the floor
    // in CSS moves the formation with it; there are no magic y numbers
    // inside the component.
    const arenaRef = useRef<HTMLDivElement | null>(null);
    const groundRef = useRef<HTMLDivElement | null>(null);
    const [groundBand, setGroundBand] = useState<GroundBand>(DEFAULT_GROUND_BAND);
    // Measuring on every render is intentional: the ground is sized and
    // tilted by CSS, so its projected rect is only known from the DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => {
        const arena = arenaRef.current;
        const ground = groundRef.current;
        if (!arena || !ground) return;
        const arenaRect = arena.getBoundingClientRect();
        const groundRect = ground.getBoundingClientRect();
        const top = Math.max(0, groundRect.top - arenaRect.top);
        const bottom = Math.min(arenaRect.height, groundRect.bottom - arenaRect.top);
        if (bottom - top < 40) return;
        setGroundBand((prev) =>
            Math.abs(prev.top - top) < 0.5 && Math.abs(prev.bottom - bottom) < 0.5 ?
                prev : { top, bottom });
    });

    // ---- the arena entities -------------------------------------------
    // Placement is frozen for the fight: it is computed from the count of
    // combatants the arena was mounted with, in roster order. A death does
    // not remove the character from these arrays, so no survivor moves.
    const placementKey = allies.map((entry) => entry.id).join(',') +
        '|' + enemies.map((entry) => entry.id).join(',');
    const allyPlacements = useMemo(
        () => layoutFormation(allies.length, 'ally', groundBand) ?? [],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [placementKey, groundBand.top, groundBand.bottom],
    );
    const enemyPlacements = useMemo(
        () => layoutFormation(enemies.length, 'enemy', groundBand) ?? [],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [placementKey, groundBand.top, groundBand.bottom],
    );
    const allySpots: ArenaSpot[] = allies.map((character, index) => ({
        character,
        side: 'ally',
        placement: allyPlacements[index],
    }));
    const enemySpots: ArenaSpot[] = enemies.map((character, index) => ({
        character,
        side: 'enemy',
        placement: enemyPlacements[index],
    }));

    const renderSide = (side: FormationSide, spots: ArenaSpot[]) => {
        const spriteBox = spriteBoxFor(side === 'ally' ? allies.length : enemies.length);
        return spots.map(({ character, placement }) => {
            if (!placement) return null;
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
                    x={placement.x}
                    y={placement.y}
                    spriteBox={spriteBox}
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

    // The tile under the acting unit's feet: the same frozen placement
    // the entity uses, so the marker never drifts off the sprite.
    const actorSpot = activeId ?
        allyPlacements[allies.findIndex((entry) => entry.id === activeId)] :
        undefined;

    // ---- the bottom status rail ---------------------------------------
    // The rail shows the acting unit (or the enemy just selected while
    // targeting). It replaces the old top banner; the battle menu lives
    // in its corner.
    const railSelection = selection[0] ?
        allies.concat(enemies).find((entry) => entry.id === selection[0]) :
        undefined;
    const railFallback = allies.find((entry) => entry.id === activeId) ??
        [activeId, inspectedId]
            .map((id) => allies.concat(enemies).find((entry) => entry.id === id))
            .find(Boolean) ??
        allies[0];
    const railCharacter = railSelection ?? railFallback;
    const railIsTarget = Boolean(railSelection && enemies.some((entry) => entry.id === railSelection.id));
    const railIsTurn = Boolean(railCharacter && railCharacter.id === activeId);
    const railName = railCharacter ? railCharacter.name : '—';
    const railLevel = railCharacter ? railCharacter.experience.level : 0;
    const railJob = railCharacter ? heldJobOf(railCharacter)?.title ?? '' : '';
    const railHp = railCharacter ? Math.round(railCharacter.stats.hp) : 0;
    const railMaxHp = railCharacter ? Math.round(railCharacter.stats.totalHp) : 0;
    const railMana = railCharacter ? Math.round(railCharacter.stats.mana ?? 0) : 0;
    const railTotalMana = railCharacter ? Math.round(railCharacter.stats.totalMana ?? 0) : 0;
    const railSprite = railCharacter ?
        SPRITES[spriteRoleOf(railCharacter) ?? 'warrior'].idle :
        undefined;
    const railStats = railCharacter ? [
        { label: 'ATK', value: Math.round(railCharacter.getStat('attack')) },
        { label: 'DEF', value: Math.round(railCharacter.getStat('defence')) },
        { label: 'M.DEF', value: Math.round(railCharacter.getStat('magicDefence')) },
        { label: 'SPD', value: Math.round(railCharacter.getStat('speed')) },
    ] : [];
    // Passives stay hidden on the enemy side: the player sees the target's
    // stats but has to learn its passive by fighting it.
    const railPassives = railCharacter && !railIsTarget ?
        passiveSkillIdsOf(railCharacter)
            .map((id) => specOf(id)?.name ?? id) :
        [];
    const railTag = railIsTarget ? '[TARGET]' : railIsTurn ? '[TURN]' : '[INFO]';

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

    // The turn-order strip lives in the app header during a fight. The
    // header slot is rendered by NewUiRouter; look it up after mount
    // (during the first render the header is not committed yet).
    const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
    const [headerMenuSlot, setHeaderMenuSlot] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setHeaderSlot(document.getElementById('newui-header-battle-slot'));
        setHeaderMenuSlot(document.getElementById('newui-header-battle-menu'));
    }, []);
    const orderStrip = (
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
                    animation: character ?
                        SPRITES[spriteRoleOf(character) ?? 'warrior'].idle :
                        undefined,
                };
            })
                // Sprite-only: chips without a picture (no matching
                // fighter) are dropped, never numbered.
                .filter((entry) => entry.animation)}
            activeId={order?.[0]?.id ?? activeId}
            maxChips={maxOrderChips}
        />
    );

    return (
        <div className="jrpg-combat" ref={rootRef}>
            <div className="place-view jrpg-field">
                {/* ---- the tilted arena ------------------------------------ */}
                <div
                    className="jrpg-arena"
                    ref={arenaRef}
                >
                    {headerMenuSlot ? null : (
                        <div className="jrpg-menu-float">
                            <BattleMenuButton onFlee={onFlee} />
                        </div>
                    )}
                    <div className="jrpg-backdrop-wall" />
                    {/* <div className="jrpg-ember" style={{ left: '15%', animationDelay: '0s' }} />
                        <div className="jrpg-ember" style={{ left: '45%', animationDelay: '2.2s' }} />
                        <div className="jrpg-ember" style={{ left: '78%', animationDelay: '4.1s' }} /> */}

                    <div className="jrpg-ground" ref={groundRef}>
                        <div className="jrpg-skirmish-line" />
                    </div>

                    <div className="jrpg-sprites-layer">
                        {actorSpot ? (
                            <div
                                className="jrpg-active-tile jrpg-active-tile--actor"
                                style={{ left: actorSpot.x, top: actorSpot.y + 6 }}
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
                                const placement = [...allySpots, ...enemySpots]
                                    .find((spot) => spot.character.id === effect.targetId);
                                if (!placement?.placement) return null;
                                return (
                                    <EffectPlayer
                                        key={effect.id}
                                        animation={effect.animation}
                                        x={placement.placement.x - effect.animation.frameWidth / 2}
                                        y={placement.placement.y - effect.animation.frameHeight}
                                        onDone={() => onEffectDone?.(effect.id)}
                                    />
                                );
                            })}
                        </div>
                    ) : null}
                    {/* </div> */}

                    {headerSlot ? null : orderStrip}

                    {forecast ? <CombatForecast attack={forecast} /> :
                        <div className="jrpg-status-rail">
                            <div
                                className="jrpg-rail-avatar"
                                style={railSprite ? {
                                    ...spriteBoxStyle(railSprite, 40),
                                    ...spriteFrameStyle(railSprite, 0, 40 / railSprite.frameWidth),
                                } : undefined}
                            />
                            <div className="jrpg-rail-main">
                                <div className="jrpg-rail-head">
                                    <span className="jrpg-rail-name">
                                        {railName}
                                        <span className={railIsTarget ? 'jrpg-rail-tag jrpg-rail-tag--target' : 'jrpg-rail-tag'}>
                                            {railTag}
                                        </span>
                                    </span>
                                    <span className="jrpg-rail-sub">LV {railLevel} · {railJob}</span>
                                </div>
                                <div className="jrpg-rail-bars">
                                    <div className="jrpg-rail-bar-row">
                                        <span className="jrpg-rail-bar-label">HP</span>
                                        <span className="jrpg-rail-bar">
                                            <span
                                                className="jrpg-rail-bar-fill jrpg-rail-bar-fill--hp"
                                                style={{ width: `${railMaxHp > 0 ? (railHp / railMaxHp) * 100 : 0}%` }}
                                            />
                                        </span>
                                        <span className="jrpg-rail-num">{railHp}/{railMaxHp}</span>
                                    </div>
                                    <div className="jrpg-rail-bar-row">
                                        <span className="jrpg-rail-bar-label">MP</span>
                                        <span className="jrpg-rail-bar">
                                            <span
                                                className="jrpg-rail-bar-fill jrpg-rail-bar-fill--mana"
                                                style={{ width: `${railTotalMana > 0 ? (railMana / railTotalMana) * 100 : 0}%` }}
                                            />
                                        </span>
                                        <span className="jrpg-rail-num">{railMana}/{railTotalMana}</span>
                                    </div>
                                </div>
                                <div className="jrpg-rail-footer">
                                    {railStats.map((stat) => (
                                        <span key={stat.label} className="jrpg-rail-stat">
                                            {stat.label} {stat.value}
                                        </span>
                                    ))}
                                    {railIsTarget ? (
                                        <span className="jrpg-rail-passives jrpg-rail-passives--unknown">Passive: ???</span>
                                    ) : railPassives.length > 0 ? (
                                        <span className="jrpg-rail-passives" title={railPassives.join(' · ')}>
                                            Passive: {railPassives.join(' · ')}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>}
                </div>


            </div>

            {headerSlot ? createPortal(orderStrip, headerSlot) : null}
            {headerMenuSlot ? createPortal(<BattleMenuButton onFlee={onFlee} />, headerMenuSlot) : null}

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
