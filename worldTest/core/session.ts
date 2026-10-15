import { Character, Item, Stats, Team } from '../../src';
import type { InventorySlot, TeamPosition } from '../../src';
import type { EquipmentSlot } from '../../src/classes/items/EquipmentManager';
import { PLACES, PLACES_BY_ID, buildNpcsFromPlaces, createInitialMissions, createInitialWorld } from './world';
import { buyItem, sellItem } from './shop';
import { equipToCharacter, unequipFromCharacter, useItemOn } from './inventory';
import { grantCombatXp } from './xp/xpSystem';
import { SAVE_VERSION } from './save/saveData';
import type { SaveData, SavedCharacter, SavedNpc } from './save/saveData';
import { buildCharacterFromSave } from './save/saveSystem';
import { DEFAULT_ITEM_TABLE } from './items';
import { LootRoller } from './loot/lootRoller';
import type { LootDrop } from './loot/lootRoller';
import type { DropTable } from './loot/dropTable';
import { EncounterTracker } from './encounters/encounterTracker';
import { SPECIAL_ENCOUNTERS, buildSpecialNpc } from './encounters/specialEncounter';
import { defaultSkillIds, skillIdsOf } from './skills';
import {
    applyGrowthLevels,
    applyJobBonuses,
    heldJobOf,
    jobById,
    jobOfCharacter,
    removeJobBonuses,
    wireCharacterGrowth,
} from './constants/jobs';
import { FaintRegistry, applyCarryStatus, clearCarryStatus } from './fainting';
import { syncPositionToWeapon } from './combat/range';
import { grantJobXp, ownedJobSkills } from './jobs/progression';
import type { BattleReport, BattleTracker } from './combat/battleTracker';
import { equipInto, equippedItemsOf, firstFreeHole, migrateLegacyEquipment, unequipHole } from './equipment/loadout';
import type { CharacterLoadout } from './equipment/loadout';
import { SkillTree } from './skillTree/skillTree';
import { createCompanionTree, createHeroTree } from './skillTree/trees';
import { LEVEL_CAP } from './config/growth';
import { Roster } from './roster';
import { ROSTER } from './config/roster';
import { addItemCapped, canAddItem } from './inventory';
import { MissionManager } from './missions';
import type { Mission, MissionRunner, MissionStep } from './missions';
import { ACT1 } from './config/act1';
import { CHATS } from './config/chats';
import { FIGHTS } from './config/fights';
import { SHOPS } from './config/shops';
import { GameCalendar, seasonNameForMonth } from './calendar';
import { FlagRegistry } from './flags';
import { FLAGS } from './constants/flags';
import { ACTS } from './config/acts';
import { StoryEngine, evaluateStoryCondition } from './story';
import type { ActDefinition, StoryCondition, StoryContext, StoryEffect } from './story';
import { MessageQueue } from './messages';
import type { DialogueLine } from './dialogue';
import type { NPC, Place, ShopEntry } from './types';

export type CombatEndContext = {
    npc?: NPC;
    placeId: string;
    // Which ally landed the killing blow on each defeated enemy.
    kills?: { enemyId: string; killerId: string }[];
    // Extra allies that fought beyond the active party (roster
    // characters that joined a hybrid battle). They earn XP and keep
    // their battle damage, exactly like party members.
    fighters?: Character[];
    // The allies that actually fought in the battle (hybrid battles
    // pass this: a manualId fight leaves the player's party out, so it
    // earns nothing). Defaults to the active party.
    participants?: Character[];
    // When the battle came from a FIGHTS constant: the fight that was
    // fought and the mission that triggered it (outcome hooks run).
    fightId?: string;
    missionId?: string;
    // The battle tracker the fight was observed with: its report is
    // carried into the result (damage dealt/received per kind, heals,
    // kills — per fighter).
    tracker?: BattleTracker;
};
export type CombatEndResult = {
    message: string;
    leveled: boolean;
    unlockedEast: boolean;
    drops: LootDrop[];
    specialSpawn?: { id: string; name: string } | null;
    // The damage report of the battle, when a tracker was attached.
    report?: BattleReport;
    // The structured victory summary (the end-of-fight modal): one row
    // per character that earned xp, with the levels it gained.
    xpRows?: { name: string; gained: number; levels: number }[];
    // Names whose job leveled into an enhancement pick.
    jobLevelUps?: string[];
    // Items the fight granted (loot plus mission rewards), by name.
    itemsGained?: { name: string; quantity: number }[];
    // Gold the fight granted (npc reward plus mission rewards).
    goldGained?: number;
};

// One travel option the map renders: a hidden place is not drawn at
// all; a blocked one is drawn but explains why through `reason`.
export type TravelTarget = {
    placeId: string;
    name: string;
    regionId: string;
    hidden: boolean;
    allowed: boolean;
    reason?: string;
};

/**
 * UI-agnostic game session. The React layer only renders what this
 * class exposes and calls its methods; no DOM/React knowledge in here.
 */
export class WorldSession {
    team: Team;
    readonly itemTable = DEFAULT_ITEM_TABLE;
    readonly specials = SPECIAL_ENCOUNTERS;
    readonly roster = new Roster();
    missions: MissionManager;
    private lootRoller: LootRoller;
    private encounterTracker = new EncounterTracker();
    private spawnedSpecials = new Set<string>();
    private npcs: Map<string, NPC[]>;
    private skillTrees: Map<string, SkillTree> = new Map([
        ['hero', createHeroTree()],
        ['companion', createCompanionTree()],
    ]);
    currentPlaceId: string = ACT1.startPlaceId;
    unlocked: Set<string> = new Set();
    // The story calendar: one day per travel, one day per mission.
    readonly calendar = new GameCalendar();
    // The story memory: flags that answer "did X happen?". Missions
    // write here when their reward steps complete; world events can
    // write here too. Persisted with the save.
    readonly flags = new FlagRegistry();
    // Fallen characters: where their corpse lies, since when, and who
    // carries it. Persisted with the save.
    readonly faints = new FaintRegistry();
    // Remaining stock per shop (bought entries are removed; an emptied
    // shop closes). Initialized from the SHOPS content.
    private shopStock = new Map<string, string[]>();
    // Global story messages: arrival events push lines here and the web
    // shows them over everything. Not part of the save.
    readonly messages = new MessageQueue();
    // A battle an arrival event queued: it starts once the messages are
    // read. Consumed by the web; not part of the save.
    private pendingBattleRef: { fightId: string; placeId: string; missionId: string } | null = null;
    // Places the story events hid (showPlace/hidePlace effects): they
    // behave exactly like hiddenUntilFlag places until shown again.
    // Persisted with the save.
    private storyHidden = new Set<string>();
    // The story spine: the registered acts and their one-shot events,
    // re-evaluated after every session change that can move the story.
    // Persisted (armed/completed/applied) with the save.
    readonly story = new StoryEngine(
        () => this.storyContext(),
        (effect) => this.applyStoryEffectInternal(effect),
    );

    constructor(options: { random?: () => number; acts?: ActDefinition[] } = {}) {
        const initial = createInitialWorld();
        this.team = initial.team;
        this.npcs = initial.npcs;
        this.roster.load(
            initial.roster,
            initial.roster.filter((character) => this.team.getCharacter(character.id)).map((character) => character.id),
        );
        // The starting party brings its worn items into the shared
        // inventory too (the same rule every team member follows).
        for (const character of this.team.getAll()) {
            this.registerWornItems(character);
        }
        this.lootRoller = new LootRoller(options.random ?? Math.random);
        this.missions = new MissionManager(
            options.random ?? Math.random,
            (flags) => {
                for (const flag of flags) this.flags.set(flag);
            },
            () => this.calendar.totalDays(),
            () => this.calendar.monthIndex(),
            (flag) => this.flags.has(flag),
        );
        for (const mission of createInitialMissions()) {
            this.missions.register(mission);
        }

        // The story spine: the registered acts (tests may inject their
        // own catalog).
        this.story.register(options.acts ?? ACTS);

        // Shops open with their full content stock.
        for (const shop of Object.values(SHOPS)) {
            this.shopStock.set(shop.id, shop.stock.map((entry) => entry.itemId));
        }
    }

    // ------------------------------------------------------------------
    // The story engine: the session answers conditions and applies the
    // effects the registered acts and dialogue choices declare.
    // ------------------------------------------------------------------

    /** The live story context the engine's conditions read. */
    private storyContext(): StoryContext {
        return {
            hasFlag: (flag) => this.flags.has(flag),
            missionState: (missionId) => {
                const runner = this.missions.runner(missionId);
                if (runner) {
                    if (runner.isComplete()) return 'complete';
                    if (runner.isFailed()) return 'failed';
                    return 'active';
                }
                return this.missions.isCompleted(missionId) ? 'complete' : 'none';
            },
            day: this.calendar.totalDays(),
        };
    }

    /** Whether a story condition holds right now (dialogue gating). */
    private storyConditionHolds(condition: StoryCondition): boolean {
        return evaluateStoryCondition(condition, this.storyContext());
    }

    /** The effect switch the story engine and the dialogue choices use. */
    private applyStoryEffectInternal(effect: StoryEffect): void {
        switch (effect.kind) {
        case 'setFlag':
            this.flags.set(effect.flag);
            return;
        case 'clearFlag':
            this.flags.remove(effect.flag);
            return;
        case 'pushChat': {
            const chat = CHATS[effect.chatId];
            if (chat) this.pushStoryLines(chat.lines);
            return;
        }
        case 'startMission':
            // Story-forced starts skip gates and commissions.
            this.activateMission(effect.missionId, 'player');
            return;
        case 'startFight':
            this.pendingBattleRef = {
                fightId: effect.fightId,
                placeId: effect.placeId,
                missionId: effect.missionId ?? '',
            };
            return;
        case 'moveNpc':
            this.moveNpc(effect.npcId, effect.toPlaceId);
            return;
        case 'showPlace':
            this.storyHidden.delete(effect.placeId);
            return;
        case 'hidePlace':
            this.storyHidden.add(effect.placeId);
            return;
        case 'setJob':
            // The branch choice: the recruit re-jobs (bonuses applied,
            // gear the new job cannot wield returns to the inventory)
            // and receives their class weapon.
            this.setJob(effect.characterId, effect.jobId);
            if (effect.weaponItemId) this.grantWeapon(effect.characterId, effect.weaponItemId);
            return;
        case 'addToTeam': {
            // The branch choice fills the squad with the classes the
            // player did NOT pick: the character joins the active party
            // (bringing its worn items into the shared inventory, like
            // every team member).
            const character = this.roster.character(effect.characterId);
            if (!character || this.team.getCharacter(effect.characterId)) return;
            if (!this.roster.activate(effect.characterId)) return;
            this.roster.rebuildTeam(this.team);
            this.registerWornItems(character);
            syncPositionToWeapon(character);
            return;
        }
        case 'skipBattle':
            // The vote's "leave": the current wait_battle step completes
            // as a retreat, so the fight never happens.
            this.retreatMissionBattle(effect.missionId);
            return;
        }
    }

    /**
     * Completes the mission's current wait_battle step as a retreat
     * (the spectral boar vote's "leave" option). A no-op when the
     * current step is not a wait_battle or does not accept 'fled'.
     */
    private retreatMissionBattle(missionId: string): void {
        const runner = this.missions.runner(missionId);
        if (!runner || runner.isComplete() || runner.isFailed()) return;
        const step = runner.current();
        if (step?.kind !== 'wait_battle') return;
        runner.reportBattle('fled');
        this.missions.checkFinished(runner);
        if (runner.isComplete()) this.revertMissionMoves(missionId);
    }

    /**
     * Applies one story effect (dialogue choices call this) and then
     * re-runs the story engine, so the choice's consequences (flag
     * chains, follow-up events) resolve immediately.
     */
    applyStoryEffect(effect: StoryEffect): void {
        this.applyStoryEffectInternal(effect);
        this.story.evaluate();
    }

    /**
     * Pushes story lines into the global message queue, hiding the
     * lines whose `when` condition does not hold right now.
     */
    private pushStoryLines(lines: DialogueLine[] | undefined): void {
        if (!lines || lines.length === 0) return;
        const visible = lines.filter((line) => !line.when || this.storyConditionHolds(line.when));
        if (visible.length > 0) this.messages.push(visible);
    }

    /** Re-evaluates the registered acts after a story-moving change. */
    private evaluateStory(): void {
        this.story.evaluate();
    }

    /**
     * Boots the story for a NEW game: the act-1 opening fires (the
     * captain's welcome and the branch choice). Called by the web when
     * a fresh session starts — never on load, so a saved game never
     * replays its opening.
     */
    beginStory(): void {
        this.applyStoryEffect({ kind: 'setFlag', flag: FLAGS.NEW_GAME });
    }

    get currentPlace(): Place {
        return PLACES_BY_ID[this.currentPlaceId];
    }

    npcsAt(placeId: string): NPC[] {
        return this.npcs.get(placeId) ?? [];
    }

    findNpc(npcId: string): NPC | undefined {
        for (const list of this.npcs.values()) {
            const found = list.find((npc) => npc.id === npcId);
            if (found) return found;
        }
        return undefined;
    }

    allNpcs(): NPC[] {
        const result: NPC[] = [];
        for (const list of this.npcs.values()) {
            result.push(...list);
        }
        return result;
    }

    victoriesAt(placeId: string): number {
        return this.encounterTracker.victoriesAt(placeId);
    }

    /**
     * The non-destructive travel gate: every lock between the current
     * place and `to`. Place-level locks always apply (they gate the
     * place itself); crossing into another region additionally needs a
     * border connection from the current place, with its own locks.
     * Shared by travel() and the map's travelTargets().
     */
    private travelGate(to: string): { ok: boolean; message?: string } {
        const target = PLACES_BY_ID[to];
        if (!target) {
            return { ok: false, message: 'You cannot travel there.' };
        }
        // A flag opens a place whether it lives in the legacy travel set
        // or in the story memory (mission rewards and story events write
        // the registry; dev tools and old saves write the set).
        const flagOpen = (flag: string): boolean =>
            this.unlocked.has(flag) || this.flags.has(flag);

        if (target.hiddenUntilFlag && !flagOpen(target.hiddenUntilFlag)) {
            return { ok: false, message: 'You cannot travel there.' };
        }
        if (this.storyHidden.has(to)) {
            return { ok: false, message: 'You cannot travel there.' };
        }
        if (target.lockedByFlag && !flagOpen(target.lockedByFlag)) {
            return { ok: false, message: target.lockedMessage ?? 'The way is closed.' };
        }
        if (target.lockedByMission && !this.missionIsActive(target.lockedByMission)) {
            return { ok: false, message: target.lockedMessage ?? 'A mission is needed to go there.' };
        }
        // Same region: any open place is a direct destination (no road
        // needed). Crossing regions needs a border connection.
        if (target.regionId !== this.currentPlace.regionId) {
            const connection = this.currentPlace.connections.find((c) => c.to === to);
            if (!connection) {
                return { ok: false, message: 'You must cross at a border location.' };
            }
            if (connection.requiredFlag && !flagOpen(connection.requiredFlag)) {
                return { ok: false, message: connection.lockedMessage ?? 'The way is closed.' };
            }
            if (connection.requiredMissionId &&
                !this.missionIsActive(connection.requiredMissionId)) {
                return { ok: false, message: connection.lockedMessage ?? 'A mission is needed to go there.' };
            }
        }
        if (!this.missions.travelAllowedTo(to)) {
            return { ok: false, message: 'Your mission does not lead there.' };
        }
        return { ok: true };
    }

    travel(to: string): { ok: boolean; message?: string; arrival?: boolean } {
        const gate = this.travelGate(to);
        if (!gate.ok) {
            return gate;
        }

        this.currentPlaceId = to;
        // Travel to another place takes a day.
        this.calendar.advance();
        // A day passed: corpses left behind for a week are lost, and
        // missions whose deadline passed fail automatically.
        const deathNews = this.expireCorpses();
        const expired = this.missions.onDayPassed();
        const justCompleted = this.missions.reportArrival(to);
        const titles = justCompleted
            .map((missionId) => this.missions.mission(missionId)?.title)
            .filter((title): title is string => Boolean(title));

        // Arrival events (story messages + queued battle) fire only
        // while the mission waits for that exact battle, so a mid-story
        // revisit never replays the opening fight.
        let arrival = false;
        const arrivalEvent = this.currentPlace.arrival;
        if (arrivalEvent && this.missionIsActive(arrivalEvent.missionId)) {
            const step = this.missionStepOf(arrivalEvent.missionId);
            const stepBattle = step?.kind === 'wait_battle' ? step.battle : undefined;
            if (stepBattle && stepBattle.fightId === arrivalEvent.fightId) {
                const chat = CHATS[arrivalEvent.chatId];
                if (chat) this.pushStoryLines(chat.lines);
                this.pendingBattleRef = {
                    fightId: arrivalEvent.fightId,
                    placeId: to,
                    missionId: arrivalEvent.missionId,
                };
                arrival = true;
            }
        }

        this.evaluateStory();

        return {
            ok: true,
            message: [
                ...(expired.length > 0 ? [`Mission expired: ${expired.join(', ')}`] : []),
                ...(titles.length > 0 ? [`Mission complete: ${titles.join(', ')}`] : []),
                ...deathNews,
            ].join(' ') || undefined,
            arrival,
        };
    }

    /**
     * Every place of the world as a travel target from the current
     * position: hidden (not drawn until its flag exists), allowed (open
     * now) or blocked with the reason the map's bar explains. Same
     * region places are direct destinations; cross-region ones need the
     * border connection from the current place.
     */
    travelTargets(): TravelTarget[] {
        const flagOpen = (flag: string): boolean =>
            this.unlocked.has(flag) || this.flags.has(flag);
        return PLACES.map((place) => {
            const hidden = (place.hiddenUntilFlag && !flagOpen(place.hiddenUntilFlag)) ||
                this.storyHidden.has(place.id);
            if (hidden) {
                return {
                    placeId: place.id,
                    name: place.name,
                    regionId: place.regionId,
                    hidden: true,
                    allowed: false,
                };
            }
            const gate = this.travelGate(place.id);
            return {
                placeId: place.id,
                name: place.name,
                regionId: place.regionId,
                hidden: false,
                allowed: gate.ok,
                reason: gate.message,
            };
        });
    }

    /** The battle an arrival event queued (null when none is pending). */
    pendingBattle(): { fightId: string; placeId: string; missionId: string } | null {
        return this.pendingBattleRef;
    }

    /** Takes and clears the queued arrival battle (one-shot). */
    consumePendingBattle(): { fightId: string; placeId: string; missionId: string } | null {
        const battle = this.pendingBattleRef;
        this.pendingBattleRef = null;
        return battle;
    }

    /**
     * Whether the mission can be accepted right now: its requirements
     * are owned AND the commission (the gold the mission costs) can be
     * paid. The UI shows `reason` when it refuses.
     */
    missionAcceptGate(missionId: string): { ok: boolean; reason?: string } {
        const mission = this.missions.mission(missionId);
        if (!mission) return { ok: false, reason: 'Unknown mission.' };
        // Story-gated missions: the board hides them until the flags
        // exist; the gate refuses direct starts too.
        if (mission.requiredFlags && !mission.requiredFlags.every((flag) => this.flags.has(flag))) {
            return { ok: false, reason: 'The story does not offer this yet.' };
        }
        // Seasonal missions only open during their season.
        if (
            mission.availableMonths &&
            mission.availableMonths.indexOf(this.calendar.monthIndex()) === -1
        ) {
            return {
                ok: false,
                reason: `Solo disponible en ${seasonNameForMonth(mission.availableMonths[0])}.`,
            };
        }
        const met = this.missionRequirementsMet(missionId);
        if (!met.ok) return met;
        if (mission.commission && this.team.gold < mission.commission) {
            return { ok: false, reason: `Need ${mission.commission} gold for the commission.` };
        }
        return { ok: true };
    }

    /**
     * Starts a registered mission on behalf of a character (the user's
     * party member that accepted it). Refused when its requirements
     * (gold / items owned) are not met or the commission cannot be
     * paid; the commission is spent on acceptance.
     */
    startMission(missionId: string, characterId: string = 'player'): boolean {
        const gate = this.missionAcceptGate(missionId);
        if (!gate.ok) return false;
        const mission = this.missions.mission(missionId);

        // The commission is spent the moment the mission is accepted.
        if (mission?.commission) {
            this.team.gold -= mission.commission;
        }

        const started = this.activateMission(missionId, characterId);
        if (started) this.evaluateStory();
        return started;
    }

    /**
     * Starts a registered mission without gates or commissions (the
     * story engine's startMission effect uses this): the runner starts,
     * the people travel/spawn with it, and a first dialogue step plays
     * its lines (queuing its battle once they are read).
     */
    private activateMission(missionId: string, characterId: string): boolean {
        const mission = this.missions.mission(missionId);
        const runner = this.missions.start(missionId, characterId);
        if (!runner || !mission) return false;

        for (const move of mission.npcMoves ?? []) {
            this.moveNpc(move.npcId, move.toPlaceId);
        }
        this.applyUnitMoves(mission);
        this.applyUnitSpawns(mission);

        // A mission whose first step is a dialogue plays its lines
        // right away (the commander's orders: form your team). When
        // the dialogue also declares a battle it is queued once the
        // lines are read; otherwise the battle waits for the story
        // (the farm fight starts on arrival).
        const first = runner.current();
        if (first && first.kind === 'dialogue') {
            if (first.lines && first.lines.length > 0) {
                this.pushStoryLines(first.lines);
            }
            while (runner.current() === first && runner.dialogueLine()) {
                runner.advanceDialogue();
            }
            if (first.battle) {
                this.pendingBattleRef = {
                    fightId: first.battle.fightId,
                    placeId: first.battle.placeId,
                    missionId,
                };
            }
        }
        // A first wait_battle step is NOT queued here: its place offers
        // the "start the mission" option (startMissionBattle) instead.
        return true;
    }

    /**
     * Whether the mission's current beat waits for a battle at the
     * place (the gate of its "start the mission" place option).
     */
    missionBattleReady(missionId: string, placeId: string): boolean {
        const runner = this.missions.runner(missionId);
        if (!runner || runner.isComplete() || runner.isFailed()) return false;
        const beat = runner.current();
        if (beat?.kind !== 'wait_battle' || !beat.battle) return false;
        return beat.battle.placeId === placeId;
    }

    /**
     * Every active mission whose current beat waits for a battle at the
     * place: the place page offers the fight option for each of them
     * (the sparring matches at the camp, the boar packs...).
     */
    battleReadyMissionsAt(placeId: string): { missionId: string; title: string }[] {
        const found: { missionId: string; title: string }[] = [];
        for (const runner of this.missions.activeMissions()) {
            if (runner.isComplete() || runner.isFailed()) continue;
            const beat = runner.current();
            if (beat?.kind !== 'wait_battle' || !beat.battle) continue;
            if (beat.battle.placeId !== placeId) continue;
            found.push({ missionId: runner.missionId(), title: runner.title() });
        }
        return found;
    }

    /**
     * Starts the mission's waiting battle from its place option: the
     * beat's lines go to the message box and the fight queues behind
     * them (it begins once the lines are read).
     */
    startMissionBattle(missionId: string): boolean {
        const runner = this.missions.runner(missionId);
        if (!runner || runner.isComplete() || runner.isFailed()) return false;
        const beat = runner.current();
        if (beat?.kind !== 'wait_battle' || !beat.battle) return false;
        if (beat.lines && beat.lines.length > 0) {
            this.pushStoryLines(beat.lines);
        }
        this.pendingBattleRef = {
            fightId: beat.battle.fightId,
            placeId: beat.battle.placeId,
            missionId,
        };
        return true;
    }

    /**
     * After a battle outcome advanced a mission, its next beat leads
     * the flow: a dialogue beat pushes its lines (queuing its battle
     * once they are read), a wait_battle beat queues its battle
     * straight away. Runs for every outcome — a lost sparring match
     * still leads to the next one.
     */
    private queueNextBeat(runner: MissionRunner | undefined): void {
        if (!runner || runner.isComplete() || runner.isFailed()) return;
        const beat = runner.current();
        if (!beat) return;

        if (beat.kind === 'dialogue') {
            if (beat.lines && beat.lines.length > 0) {
                this.pushStoryLines(beat.lines);
            }
            while (runner.current() === beat && runner.dialogueLine()) {
                runner.advanceDialogue();
            }
            if (beat.battle) {
                this.pendingBattleRef = {
                    fightId: beat.battle.fightId,
                    placeId: beat.battle.placeId,
                    missionId: runner.missionId(),
                };
            }
            return;
        }

        if (beat.kind === 'wait_battle' && beat.battle) {
            // No dialogue between battles: queue it right away.
            this.pendingBattleRef = {
                fightId: beat.battle.fightId,
                placeId: beat.battle.placeId,
                missionId: runner.missionId(),
            };
        }
    }

    /**
     * Whether the mission can be accepted right now: the player must
     * own its requirements (gold and/or items). Ownership is a gate —
     * nothing is consumed.
     */
    missionRequirementsMet(missionId: string): { ok: boolean; reason?: string } {
        const mission = this.missions.mission(missionId);
        if (!mission) return { ok: false, reason: 'Unknown mission.' };

        const requirements = mission.requirements;
        if (!requirements) return { ok: true };

        if (requirements.gold && this.team.gold < requirements.gold) {
            return { ok: false, reason: `Need ${requirements.gold} gold.` };
        }
        for (const entry of requirements.items ?? []) {
            const owned = this.team.inventory.getItemSlotByItemId(entry.itemId)?.totalQuantity ?? 0;
            if (owned < entry.quantity) {
                const name = this.itemTable.get(entry.itemId)?.name ?? entry.itemId;
                return { ok: false, reason: `Need ${entry.quantity}× ${name}.` };
            }
        }
        return { ok: true };
    }

    /**
     * Cancels an accepted mission: it returns to the available board,
     * the people that travelled with it move back, and its routes close.
     */
    cancelMission(missionId: string): boolean {
        const cancelled = this.missions.cancel(missionId);
        if (cancelled) {
            this.revertMissionMoves(missionId);
            // The queued arrival battle belongs to the mission: drop it.
            this.pendingBattleRef = null;
            this.evaluateStory();
        }
        return cancelled;
    }

    /** Moves a live npc from whatever place it is in to another one. */
    private moveNpc(npcId: string, toPlaceId: string): void {
        for (const [placeId, list] of this.npcs) {
            const index = list.findIndex((npc) => npc.id === npcId);
            if (index === -1) continue;
            const [npc] = list.splice(index, 1);
            const target = this.npcs.get(toPlaceId) ?? [];
            target.push(npc);
            this.npcs.set(toPlaceId, target);
            return;
        }
    }

    /**
     * Sends the people that travelled with a mission back to their
     * homes and removes the units it generated. Runs when the mission
     * finishes for any reason (complete, failed, cancelled).
     */
    private revertMissionMoves(missionId: string): void {
        const mission = this.missions.mission(missionId);
        if (!mission) return;
        for (const move of mission.npcMoves ?? []) {
            this.moveNpc(move.npcId, move.fromPlaceId);
        }
        // Unit moves: the same number of the same group returns home.
        for (const move of mission.unitMoves ?? []) {
            const pool = (this.npcs.get(move.toPlaceId) ?? [])
                .filter((npc) => !move.group || npc.group === move.group);
            for (let index = 0; index < Math.min(move.count, pool.length); index++) {
                this.moveNpc(pool[index].id, move.fromPlaceId);
            }
        }
        // Generated units leave the world.
        for (const spawn of mission.unitSpawns ?? []) {
            const list = (this.npcs.get(spawn.placeId) ?? [])
                .filter((npc) => npc.id.indexOf(`${missionId}_unit_`) !== 0);
            this.npcs.set(spawn.placeId, list);
        }
    }

    /** Moves whole groups of people for a mission ("move X from Y to Z"). */
    private applyUnitMoves(mission: Mission): void {
        for (const move of mission.unitMoves ?? []) {
            const pool = (this.npcs.get(move.fromPlaceId) ?? [])
                .filter((npc) => !move.group || npc.group === move.group);
            for (let index = 0; index < Math.min(move.count, pool.length); index++) {
                this.moveNpc(pool[index].id, move.toPlaceId);
            }
        }
    }

    /** Generates new people for a mission ("generate X in Y place"). */
    private applyUnitSpawns(mission: Mission): void {
        for (const spawn of mission.unitSpawns ?? []) {
            const list = this.npcs.get(spawn.placeId) ?? [];
            for (let index = 0; index < spawn.count; index++) {
                const id = `${mission.id}_unit_${index}`;
                if (this.findNpc(id)) continue; // idempotent
                const character = new Character({
                    id,
                    name: spawn.name,
                    stats: new Stats(spawn.stats),
                });
                list.push({
                    id,
                    character,
                    talk: spawn.talk,
                    xpReward: 0,
                    goldReward: 0,
                    group: spawn.group,
                });
            }
            this.npcs.set(spawn.placeId, list);
        }
    }

    /**
     * Re-applies the unit spawns of every active mission (idempotent by
     * the generated ids). Called after a load, so missions that generate
     * people never lose them to a save/load.
     */
    ensureMissionUnits(): void {
        for (const runner of this.missions.activeMissions()) {
            const mission = this.missions.mission(runner.missionId());
            if (mission?.unitSpawns) this.applyUnitSpawns(mission);
        }
    }

    // ------------------------------------------------------------------
    // Precise game-state queries: content asks exactly where the game is.
    // ------------------------------------------------------------------
    missionStepOf(missionId: string): MissionStep | undefined {
        return this.missions.runner(missionId)?.current();
    }

    missionIsActive(missionId: string): boolean {
        const runner = this.missions.runner(missionId);
        return Boolean(runner && !runner.isComplete() && !runner.isFailed());
    }

    missionIsComplete(missionId: string): boolean {
        return this.missions.isCompleted(missionId);
    }

    hasFlag(flag: string): boolean {
        return this.flags.has(flag);
    }

    rest(): void {
        for (const member of this.team.getAll()) {
            member.stats.hp = member.stats.totalHp;
            member.stats.isAlive = 1;
        }
    }

    /**
     * Testing shortcut: levels every party member up by `levels`
     * (clamped to the growth level cap), applying their job growth and
     * healing them to full.
     */
    train(levels: number): { message: string } {
        const summary: string[] = [];
        for (const member of this.team.getAll()) {
            const next = Math.min(LEVEL_CAP, member.experience.level + levels);
            if (next === member.experience.level) {
                summary.push(`${member.name} (max Lv ${LEVEL_CAP})`);
                continue;
            }
            const gained = next - member.experience.level;
            member.experience.level = next;
            member.experience.currentXp = 0;
            applyGrowthLevels(member, gained);
            summary.push(`${member.name} Lv ${next}`);
        }
        return { message: `💪 ${summary.join(' · ')}` };
    }

    /**
     * Adds a character to the roster (joining the active party while
     * there is room) and refreshes the team.
     */
    addRosterCharacter(character: Character): void {
        // The new UI shows the five-hole loadout: recruited people wear
        // their gear there instead of the legacy manager.
        migrateLegacyEquipment(character);
        this.roster.add(character);
        this.roster.rebuildTeam(this.team);
    }

    /**
     * Replaces the active party with the given roster ids. The squad
     * holds the player plus five more characters (six total).
     */
    setActiveParty(ids: string[]): { ok: boolean; message: string } {
        const before = new Set(this.roster.activeIds());
        // Fainted characters are corpses: they cannot join the squad
        // until the fountain brings them back.
        this.roster.setActive(ids.filter((id) => !this.faints.has(id)), this.squadLimit());
        this.roster.rebuildTeam(this.team);
        // A character joining the team brings the objects it wears into
        // the shared inventory (owned, marked as equipped).
        for (const id of ids) {
            if (before.has(id)) continue;
            const character = this.roster.character(id);
            if (!character) continue;
            this.registerWornItems(character);
            // Adding to the team places the character in the row its
            // reach belongs to: 'all' back, 'long' center, 'short' front.
            syncPositionToWeapon(character);
        }
        const names = this.team.getAll().map((character) => character.name).join(', ');
        return { ok: this.team.count() > 0, message: names ? `Active party: ${names}` : 'Active party is empty.' };
    }

    /**
     * Registers a character's worn items into the shared inventory as
     * owned copies (the equipped one is marked, a spare bag copy
     * absorbs it, and unknown items join when the bag can hold them).
     */
    private registerWornItems(character: Character): void {
        for (const worn of equippedItemsOf(character)) {
            const slot = this.team.inventory.getItemSlotByItemId(worn.id);
            if (!slot) {
                if (!canAddItem(this.team, worn)) continue;
                this.team.inventory.addItem(new Item(worn.definition), 1);
                this.team.inventory.consumeAvailable(worn.id, 1);
            } else if (slot.quantity > 0) {
                // Already owned: one available copy becomes equipped.
                this.team.inventory.consumeAvailable(worn.id, 1);
            }
        }
    }

    /**
     * How many characters the party may hold: the six-person squad.
     */
    squadLimit(): number {
        return ROSTER.maxActiveParty;
    }

    /**
     * Moves a team member to another formation row (front ×3 taunt,
     * center ×2, back ×1). Unknown ids are refused.
     */
    setPosition(characterId: string, position: TeamPosition): boolean {
        const character = this.team.getCharacter(characterId);
        if (!character) return false;
        character.position = position;
        return true;
    }

    // -----------------------------------------------------------------------
    // Fainting: fallen teammates become corpses at the battle place.
    // -----------------------------------------------------------------------

    /** Whether the character lies fainted somewhere (waiting for help). */
    isFainted(characterId: string): boolean {
        return this.faints.has(characterId);
    }

    /** Corpses lying at a place (carried ones travel with the party). */
    corpsesAt(placeId: string): { character: Character; daysLeft: number }[] {
        this.expireCorpses();
        return this.faints
            .at(placeId)
            .map((entry) => this.roster.character(entry.characterId))
            .filter((character): character is Character => Boolean(character))
            .map((character) => ({
                character,
                daysLeft: this.faints.daysLeft(character.id, this.calendar.totalDays()),
            }));
    }

    /**
     * A party member picks up a corpse lying at the current place. Each
     * character carries at most one, with the persistent penalties.
     */
    pickUpCorpse(characterId: string, carrierId: string): { ok: boolean; message: string } {
        this.expireCorpses();
        const entry = this.faints.get(characterId);
        if (!entry || entry.carriedBy || entry.placeId !== this.currentPlaceId) {
            return { ok: false, message: 'That corpse is not here.' };
        }
        const carrier = this.team.getCharacter(carrierId) ?? this.roster.character(carrierId);
        const fallen = this.roster.character(characterId);
        if (!carrier || !fallen) {
            return { ok: false, message: 'Unknown character.' };
        }
        if (carrier.id === characterId) {
            return { ok: false, message: 'A character cannot carry themselves.' };
        }
        if (carrier.stats.hp <= 0) {
            return { ok: false, message: `${carrier.name} is in no shape to carry anyone.` };
        }
        if (this.faints.carriedBy(carrierId)) {
            return { ok: false, message: `${carrier.name} already carries a corpse.` };
        }

        this.faints.carry(characterId, carrierId);
        applyCarryStatus(carrier);
        return { ok: true, message: `${carrier.name} picked up ${fallen.name}.` };
    }

    /**
     * The fainted characters the camp fountain can revive right now:
     * corpses lying at the camp plus the ones hauled in by the party.
     */
    fountainCandidates(): { character: Character; daysLeft: number }[] {
        this.expireCorpses();
        const candidates: Character[] = [];
        const seen = new Set<string>();

        if (this.currentPlaceId === 'camp') {
            for (const member of this.team.getAll()) {
                const carried = this.faints.carriedBy(member.id);
                if (!carried) continue;
                const fallen = this.roster.character(carried.characterId);
                if (fallen && !seen.has(fallen.id)) {
                    seen.add(fallen.id);
                    candidates.push(fallen);
                }
            }
        }
        for (const entry of this.faints.at('camp')) {
            const fallen = this.roster.character(entry.characterId);
            if (fallen && !seen.has(fallen.id)) {
                seen.add(fallen.id);
                candidates.push(fallen);
            }
        }

        return candidates.map((character) => ({
            character,
            daysLeft: this.faints.daysLeft(character.id, this.calendar.totalDays()),
        }));
    }

    /**
     * The fountain revives a fainted character whose corpse is at the
     * camp (hauled in by a party member or left there): full hp, back
     * in the roster, and the carrier drops the burden.
     */
    reviveAtFountain(characterId: string): { ok: boolean; message: string } {
        this.expireCorpses();
        const entry = this.faints.get(characterId);
        if (!entry) {
            return { ok: false, message: 'Nobody by that name lies here.' };
        }
        const carriedIn = entry.carriedBy && this.currentPlaceId === 'camp';
        const lyingHere = !entry.carriedBy && entry.placeId === 'camp';
        if (!carriedIn && !lyingHere) {
            return { ok: false, message: 'The corpse is not at the fountain.' };
        }
        const fallen = this.roster.character(characterId);
        if (!fallen) {
            return { ok: false, message: 'Unknown character.' };
        }

        fallen.stats.hp = fallen.stats.totalHp;
        fallen.stats.isAlive = 1;
        if (entry.carriedBy) {
            const carrier = this.team.getCharacter(entry.carriedBy) ?? this.roster.character(entry.carriedBy);
            if (carrier) clearCarryStatus(carrier);
        }
        this.faints.revive(characterId);
        return { ok: true, message: `${fallen.name} is back on their feet!` };
    }

    /**
     * The week ran out for some corpses: their owners die for good —
     * their equipment returns to the shared inventory, their camp
     * presence disappears and any carrier drops the burden. Returns one
     * news line per death.
     */
    private expireCorpses(): string[] {
        const carriedBefore = new Map(
            this.faints.all().map((entry) => [entry.characterId, entry.carriedBy]),
        );
        const expired = this.faints.expire(this.calendar.totalDays());
        const news: string[] = [];
        for (const id of expired) {
            const character = this.roster.character(id);
            const name = character?.name ?? id;
            if (character) {
                for (const item of equippedItemsOf(character)) {
                    if (this.team.inventory.getItemSlotByItemId(item.id)) {
                        this.team.inventory.returnAvailable(item.id, 1);
                    } else if (canAddItem(this.team, item)) {
                        this.team.inventory.addItem(new Item(item.definition), 1);
                    }
                }
                this.roster.remove(id);
                this.roster.rebuildTeam(this.team);
                for (const [placeId, list] of this.npcs) {
                    if (list.some((npc) => npc.id === id)) {
                        this.removeNpcFromPlace(placeId, id);
                    }
                }
            }
            const carrierId = carriedBefore.get(id);
            if (carrierId) {
                const carrier = this.team.getCharacter(carrierId) ?? this.roster.character(carrierId);
                if (carrier) clearCarryStatus(carrier);
            }
            news.push(`${name} was left behind too long and died.`);
        }
        return news;
    }

    /**
     * After a battle, the teammates that fell stay behind as corpses at
     * the battle place (the player always drags themselves back). They
     * leave the active party until someone carries them to a fountain.
     * Returns the names of the fallen.
     */
    private faintFallen(placeId: string, battleCrew: Character[]): string[] {
        const fallen: Character[] = [];
        const seen = new Set<string>();
        for (const character of battleCrew) {
            if (seen.has(character.id)) continue;
            seen.add(character.id);
            if (character.id === 'player') continue;
            if (character.stats.hp > 0) continue;
            fallen.push(character);
        }
        for (const character of fallen) {
            // A fallen carrier drops the corpse they hauled: it stays
            // with them at the battle place.
            const carried = this.faints.carriedBy(character.id);
            if (carried) {
                this.faints.drop(carried.characterId, placeId);
                clearCarryStatus(character);
            }
            this.faints.faint(character.id, placeId, this.calendar.totalDays());
            this.roster.deactivate(character.id);
        }
        if (fallen.length > 0) {
            this.roster.rebuildTeam(this.team);
        }
        return fallen.map((character) => character.name);
    }

    removeRosterCharacter(id: string): void {
        this.roster.remove(id);
        this.roster.rebuildTeam(this.team);
    }

    /**
     * Performs a place task (gathering items...): adds the reward to
     * the shared inventory when capacity allows, and reports the task
     * to missions so matching steps complete.
     */
    doTask(task: { id?: string; itemId: string; quantity: number }): { ok: boolean; message: string } {
        if (!this.itemTable.has(task.itemId)) {
            return { ok: false, message: 'Unknown task reward.' };
        }
        const item = this.itemTable.createItem(task.itemId);
        if (!addItemCapped(this.team, item, task.quantity)) {
            return { ok: false, message: 'Inventory is full.' };
        }
        let missionMessage = '';
        if (task.id) {
            const justCompleted = this.missions.reportTask(task.id);
            const titles = justCompleted
                .map((missionId) => this.missions.mission(missionId)?.title)
                .filter((title): title is string => Boolean(title));
            if (titles.length > 0) {
                missionMessage = ` Mission complete: ${titles.join(', ')}`;
            }
        }
        this.evaluateStory();
        return { ok: true, message: `You gathered ${task.quantity} ${item.name}.${missionMessage}` };
    }

    /**
     * Mission markers placed on a place ("mission here").
     */
    markersAt(placeId: string): { missionId: string; stepId: string }[] {
        return this.missions.markersAt(placeId);
    }

    /**
     * Active missions whose current step happens in the place.
     */
    activeMissionsAt(placeId: string): { missionId: string; title: string }[] {
        return this.missions.activeAt(placeId);
    }

    /**
     * The entries a shop still sells (empty = the shop is closed).
     */
    shopEntries(shopId: string): ShopEntry[] {
        const shop = SHOPS[shopId];
        const remaining = this.shopStock.get(shopId) ?? [];
        if (!shop) return [];

        const entries: ShopEntry[] = [];
        for (const stock of shop.stock) {
            if (remaining.indexOf(stock.itemId) === -1) continue;
            if (!this.itemTable.has(stock.itemId)) continue;
            const item = this.itemTable.createItem(stock.itemId);
            entries.push({ item, buyPrice: stock.buyPrice, sellPrice: item.sellValue });
        }
        return entries;
    }

    /** True when the shop has nothing left to sell. */
    shopClosed(shopId: string): boolean {
        return this.shopEntries(shopId).length === 0;
    }

    buy(shopId: string, entry: ShopEntry): 'ok' | 'no_gold' | 'inventory_full' | 'sold_out' {
        const remaining = this.shopStock.get(shopId);
        if (!remaining || remaining.indexOf(entry.item.id) === -1) {
            return 'sold_out';
        }
        const result = buyItem(this.team, entry);
        if (result === 'ok') {
            this.shopStock.set(
                shopId,
                remaining.filter((itemId) => itemId !== entry.item.id),
            );
        }
        return result;
    }

    sell(slot: InventorySlot): boolean {
        return sellItem(this.team, slot);
    }

    equipTo(itemId: string, characterId: string): boolean {
        // Team members and camp-roster characters can both be dressed.
        const character = this.team.getCharacter(characterId) ?? this.roster.character(characterId);
        if (!character) return false;
        return equipToCharacter(this.team.inventory, character, itemId);
    }

    unequipFrom(characterId: string, slot: EquipmentSlot): boolean {
        const character = this.team.getCharacter(characterId) ?? this.roster.character(characterId);
        if (!character) return false;
        return unequipFromCharacter(this.team.inventory, character, slot);
    }

    /**
     * Swaps the character's job: the old job's stat bonuses are removed,
     * the new job's are applied straight to the stats, and every item
     * the new job cannot wield is unequipped back into the inventory.
     * Skills follow the job automatically (they derive from jobOf).
     */
    setJob(characterId: string, jobId: string): { ok: boolean; message: string } {
        const character = this.team.getCharacter(characterId) ?? this.roster.character(characterId);
        const job = jobById(jobId);
        if (!character || !job) {
            return { ok: false, message: 'Unknown character or job.' };
        }

        const previous = heldJobOf(character);
        const jobLabel = job.id === 'adventurer' ? 'an Adventurer' : `a ${job.title}`;
        if (previous?.id === job.id) {
            return { ok: true, message: `${character.name} is already ${jobLabel}.` };
        }

        if (previous) removeJobBonuses(character, previous);
        character.jobId = job.id;
        applyJobBonuses(character, job);

        // The new job may not wield everything the old one could: those
        // items go back to the shared inventory (loadout or legacy).
        // Weapons the job refuses AND shields on jobs that cannot carry
        // them both count — the shield's legacy slot is 'armor', so the
        // check reads the loadout kind, not the legacy slot.
        const removed: string[] = [];
        for (const item of equippedItemsOf(character)) {
            const kind = item.definition.loadoutSlot;
            const weaponBlocked = (kind === 'weapon' || (kind === undefined && item.definition.slot === 'weapon')) &&
                !job.allowsWeapon(item.definition.weaponType);
            const shieldBlocked = kind === 'offhand' && !job.canShield;
            if (!weaponBlocked && !shieldBlocked) continue;
            const loadout = character.loadout;
            const holeIndex = loadout ?
                loadout.holes.findIndex((entry) => entry?.id === item.id) :
                -1;
            if (holeIndex !== -1) {
                const result = unequipHole(character, holeIndex);
                if (result.ok) {
                    for (const removedItem of result.removed) {
                        this.team.inventory.returnAvailable(removedItem.id, 1);
                    }
                    removed.push(item.name);
                }
            } else if (unequipFromCharacter(this.team.inventory, character, 'weapon')) {
                removed.push(item.name);
            }
        }

        const removedNote = removed.length > 0 ? ` Unequipped: ${removed.join(', ')}.` : '';
        return { ok: true, message: `${character.name} is now ${jobLabel}.${removedNote}` };
    }

    /**
     * Hands a character an item directly (the branch's class weapon):
     * the instance is created from the catalog and equipped into the
     * loadout, exactly like the character generator does. Idempotent: a
     * character already carrying the item keeps theirs. The granted
     * item joins the shared inventory as an owned (equipped) copy, so
     * it shows in the player's bag.
     */
    private grantWeapon(characterId: string, itemId: string): void {
        const character = this.team.getCharacter(characterId) ?? this.roster.character(characterId);
        if (!character) return;
        for (const item of equippedItemsOf(character)) {
            if (item.id === itemId) return;
        }
        if (!this.itemTable.has(itemId)) return;
        const item = this.itemTable.createItem(itemId);
        const result = equipInto(character, firstFreeHole(character), item);
        if (!result.ok && item.definition.slot) {
            character.equipment.equipOrReplace(item, character);
        }
        // What the equipping replaced (a two-handed bow drops the
        // shield) returns to the shared bag — it must never vanish.
        for (const replacedItem of result.replaced) {
            this.team.inventory.returnAvailable(replacedItem.id, 1);
        }
        this.registerWornItems(character);
        // The class weapon decides the formation row: bows stand in the
        // back, staffs in the center, swords up front.
        syncPositionToWeapon(character);
    }

    useOn(slot: InventorySlot, characterId: string): boolean {
        const character = this.team.getCharacter(characterId);
        if (!character) return false;
        return useItemOn(this.team.inventory, slot, character);
    }

    skillTreeOf(characterId: string): SkillTree | undefined {
        return this.skillTrees.get(characterId);
    }

    // Default skills plus the base ones of the character plus the skills
    // granted by learned tree nodes, plus the job's owned skills (the
    // level-3 and level-5 unlocks of its progression ladder).
    availableSkillIds(character: Character): string[] {
        const base = skillIdsOf(character);
        const tree = this.skillTreeOf(character.id);
        const learned = tree ? tree.learnedSkillIds() : [];
        const ids: string[] = [];
        for (const id of [...defaultSkillIds(), ...base, ...ownedJobSkills(character), ...learned]) {
            if (ids.indexOf(id) === -1) ids.push(id);
        }
        return ids;
    }

    unlockNode(characterId: string, nodeId: string): { ok: boolean; message: string } {
        const character = this.team.getCharacter(characterId);
        const tree = this.skillTreeOf(characterId);
        if (!character || !tree) {
            return { ok: false, message: 'No skill tree for this character.' };
        }

        const node = tree.node(nodeId);
        if (!node) {
            return { ok: false, message: 'Unknown skill node.' };
        }
        if (tree.isLearned(nodeId)) {
            return { ok: false, message: 'Already learned.' };
        }

        const context = { character, session: this, tree };
        if (!tree.unlock(node, context)) {
            const unmet = node.conditions
                .filter((condition) => !condition.isMet(context))
                .map((condition) => condition.describe());
            return { ok: false, message: `Requirements not met: ${unmet.join('; ')}` };
        }

        return { ok: true, message: `Learned ${node.name}!` };
    }

    private rollLoot(table?: DropTable): LootDrop[] {
        if (!table) return [];
        return this.lootRoller.roll(table);
    }

    private grantLoot(drops: LootDrop[]): void {
        for (const drop of drops) {
            // Drops referencing items outside the catalog are skipped,
            // and so are drops that would overflow the inventory
            // capacity: loot tables may outlive the item catalog during
            // rebuilds.
            if (!this.itemTable.has(drop.itemId)) continue;
            const item = this.itemTable.createItem(drop.itemId);
            if (!canAddItem(this.team, item)) continue;
            this.team.inventory.addItem(item, drop.quantity);
        }
    }

    private removeNpcFromPlace(placeId: string, npcId: string): void {
        const list = this.npcs.get(placeId) ?? [];
        this.npcs.set(placeId, list.filter((npc) => npc.id !== npcId));
    }

    private checkSpecialEncounters(placeId: string): { id: string; name: string } | null {
        const count = this.encounterTracker.victoriesAt(placeId);

        for (const special of this.specials) {
            if (special.placeId !== placeId) continue;
            if (special.repeat === 'once' && this.spawnedSpecials.has(special.id)) continue;

            const triggered = special.repeat === 'once' ?
                count === special.triggerAfter :
                count % special.triggerAfter === 0;

            if (!triggered) continue;
            if (this.findNpc(special.id)) continue; // still there (undefeated)

            const npc = buildSpecialNpc(special);
            const list = this.npcs.get(placeId) ?? [];
            list.push(npc);
            this.npcs.set(placeId, list);
            this.spawnedSpecials.add(special.id);
            return { id: npc.id, name: npc.character.name };
        }

        return null;
    }

    finishCombat(result: 'won' | 'lost' | 'fled', context: CombatEndContext): CombatEndResult {
        // Fight constants carry outcome hooks: they receive the mission
        // that triggered the fight (on_flee -> mission.fail()).
        const fight = context.fightId ? FIGHTS[context.fightId] : undefined;
        const fightMission = context.missionId ? this.missions.runner(context.missionId) : undefined;
        if (fight && fightMission) {
            if (result === 'won') fight.onWin?.(fightMission);
            else if (result === 'fled') fight.onFlee?.(fightMission);
            else if (result === 'lost') fight.onLose?.(fightMission);
            if (fightMission.isFailed()) {
                // The people that travelled with the mission move back,
                // and the failed mission returns to the available board.
                this.revertMissionMoves(fightMission.missionId());
                this.missions.forgetFailure(fightMission.missionId());
            }
        }
        // Sparring against the camp's own people is non-lethal: the
        // camp fighters recover after the match, whatever its outcome.
        if (fight?.enemyIds) {
            for (const id of fight.enemyIds) {
                const enemy = this.findNpc(id);
                if (enemy) {
                    enemy.character.stats.hp = enemy.character.stats.totalHp;
                    enemy.character.stats.isAlive = 1;
                }
            }
        }
        const failedMissionTitles = fightMission?.isFailed() ? [fightMission.title()] : [];
        // The damage report the attached battle tracker carries out.
        const report = context.tracker?.report();

        if (result === 'fled') {
            // Running away: no rewards, no punishment, the fought npc
            // recovers so the rematch is fair. Missions see the outcome.
            if (context.npc) {
                context.npc.character.stats.hp = context.npc.character.stats.totalHp;
                context.npc.character.stats.isAlive = 1;
            }
            // Whoever fell during the escape stays behind as a corpse.
            const fledCrew = [
                ...(context.participants ?? this.team.getAll()),
                ...(context.fighters ?? []),
            ];
            const fallen = this.faintFallen(context.placeId, fledCrew);
            const leftBehind = fallen.length > 0 ?
                ` ${fallen.join(', ')} ${fallen.length === 1 ? 'was' : 'were'} left behind.` :
                '';
            this.missions.reportBattle('fled');
            // The mission may have advanced (the spectral boar retreat):
            // queue its next beat like any other outcome.
            this.queueNextBeat(fightMission);
            this.evaluateStory();
            return {
                message: failedMissionTitles.length > 0 ?
                    `You fled the battle. Mission failed: ${failedMissionTitles.join(', ')}${leftBehind}` :
                    `You fled the battle.${leftBehind}`,
                leveled: false,
                unlockedEast: false,
                drops: [],
                specialSpawn: null,
                report,
            };
        }

        if (result === 'lost') {
            this.currentPlaceId = ACT1.startPlaceId;
            for (const member of this.team.getAll()) {
                member.stats.hp = 1;
                member.stats.isAlive = 1;
            }
            // Roster fighters that joined the battle wake up at home too.
            for (const fighter of context.fighters ?? []) {
                fighter.stats.hp = 1;
                fighter.stats.isAlive = 1;
            }
            // The world resets: the fought npc recovers so the rematch is fair.
            if (context.npc) {
                context.npc.character.stats.hp = context.npc.character.stats.totalHp;
                context.npc.character.stats.isAlive = 1;
            }
            this.missions.reportBattle('lost');
            // A lost sparring match still leads to the next one: the
            // beat queue follows every outcome.
            this.queueNextBeat(fightMission);
            this.evaluateStory();
            return {
                message: failedMissionTitles.length > 0 ?
                    `Your party was defeated. You wake up in Central Town. Mission failed: ${failedMissionTitles.join(', ')}` :
                    'Your party was defeated. You wake up in Central Town.',
                leveled: false,
                unlockedEast: false,
                drops: [],
                specialSpawn: null,
                report,
            };
        }

        const completedMissions = this.missions.reportBattle('won');

        // Missions finished by the victory: the people that travelled
        // with them go back home.
        for (const missionId of completedMissions) {
            this.revertMissionMoves(missionId);
        }

        // Mission payouts: the declared rewards (items, gold) and job
        // xp land on completion. Job xp goes on the HELD job of every
        // party member (the one they trained during the fight). Members
        // whose job leveled into an enhancement pick get the level-up
        // note.
        const levelUpNames: string[] = [];
        const itemsGained: { name: string; quantity: number }[] = [];
        let goldGained = 0;
        for (const missionId of completedMissions) {
            const details = this.missions.mission(missionId)?.details;
            const rewardGold = details?.rewardGold ?? 0;
            if (rewardGold > 0) {
                this.team.gold += rewardGold;
                goldGained += rewardGold;
            }
            for (const reward of details?.rewards ?? []) {
                if (!this.itemTable.has(reward.itemId)) continue;
                const item = this.itemTable.createItem(reward.itemId);
                if (!canAddItem(this.team, item)) continue;
                this.team.inventory.addItem(item, reward.quantity);
                const existing = itemsGained.find((entry) => entry.name === item.name);
                if (existing) {
                    existing.quantity += reward.quantity;
                } else {
                    itemsGained.push({ name: item.name, quantity: reward.quantity });
                }
            }
            const jobXp = details?.jobXp ?? 0;
            if (jobXp <= 0) continue;
            for (const member of this.team.getAll()) {
                const grant = grantJobXp(member, jobXp);
                if (grant.pendingPicks > 0 && levelUpNames.indexOf(member.name) === -1) {
                    levelUpNames.push(member.name);
                }
            }
        }

        // A won battle can open the mission's next beat (dialogue
        // and/or its battle). Handled by the shared beat queue.
        this.queueNextBeat(fightMission);

        const { npc, placeId } = context;
        this.encounterTracker.recordVictory(placeId);

        // The allies that actually fought earn the XP and assists. A
        // hybrid battle passes its participants explicitly (a manualId
        // boss fight leaves the player's party out, so it earns nothing
        // there); everything else defaults to the active party.
        const fighters = context.fighters ?? [];
        const participants = context.participants ?? this.team.getAll();
        const battleAllies = participants.filter(
            (character, index, list) =>
                character.stats.hp > 0 &&
                list.findIndex((entry) => entry.id === character.id) === index,
        );
        const killerOf = (killerId: string): Character | undefined =>
            this.team.getCharacter(killerId) ??
            participants.find((character) => character.id === killerId) ??
            fighters.find((fighter) => fighter.id === killerId);

        let leveled: boolean;
        let message: string;
        let unlockedEast = false;
        const xpRows: { name: string; gained: number; levels: number }[] = [];
        const addXpRow = (grant: { character: Character; gained: number; levels: number }) => {
            const existing = xpRows.find((row) => row.name === grant.character.name);
            if (existing) {
                existing.gained += grant.gained;
                existing.levels += grant.levels;
            } else {
                xpRows.push({ name: grant.character.name, gained: grant.gained, levels: grant.levels });
            }
        };

        if (npc) {
            const killerId = context.kills?.[0]?.killerId;
            const killer = (killerId ? this.team.getCharacter(killerId) : undefined) ?? this.team.getAlive()[0];
            const xpGrants = grantCombatXp({
                killer,
                allies: this.team.getAlive(),
                creatureLevel: npc.level ?? 1,
                customXp: npc.customXp,
            });
            leveled = xpGrants.some((grant) => grant.levels > 0);
            for (const grant of xpGrants) addXpRow(grant);
            this.team.gold += npc.goldReward;
            goldGained += npc.goldReward;

            if (npc.recruitOnDefeat) {
                npc.character.stats.hp = 1;
                npc.character.stats.isAlive = 1;
                this.team.addCharacter(npc.character);
                // Added to the team: take the row its reach belongs to.
                syncPositionToWeapon(npc.character);
                this.removeNpcFromPlace(placeId, npc.id);
            } else if (npc.respawns) {
                npc.character.stats.hp = npc.character.stats.totalHp;
                npc.character.stats.isAlive = 1;
            } else {
                this.removeNpcFromPlace(placeId, npc.id);
            }

            const xpSummary = xpGrants.map((grant) => `${grant.character.name} +${grant.gained} XP`).join(' · ');
            message = npc.recruitOnDefeat ?
                `${npc.character.name} joined your party!` :
                leveled ?
                    `Victory! +${npc.goldReward}g · ${xpSummary} · leveled up!` :
                    `Victory! +${npc.goldReward}g · ${xpSummary}.`;
        } else {
            const kills = context.kills ?? [];
            let anyLeveled = false;
            let totalXp = 0;
            const grantForKiller = (killer: Character) => {
                const grants = grantCombatXp({ killer, allies: battleAllies, creatureLevel: 1 });
                totalXp += grants.reduce((sum, grant) => sum + grant.gained, 0);
                for (const grant of grants) addXpRow(grant);
                if (grants.some((grant) => grant.levels > 0)) anyLeveled = true;
            };

            if (kills.length > 0) {
                for (const kill of kills) {
                    const killer = killerOf(kill.killerId);
                    if (killer) grantForKiller(killer);
                }
            } else {
                const fallback = this.team.getAlive()[0] ?? fighters.find((fighter) => fighter.stats.hp > 0);
                if (fallback) grantForKiller(fallback);
            }

            leveled = anyLeveled;
            this.team.gold += 15;
            goldGained += 15;
            message = leveled ? `Victory! ${totalXp} XP total — someone leveled up!` : `Victory! ${totalXp} XP total.`;
        }

        const drops = this.rollLoot(npc ? npc.dropTable : undefined);
        this.grantLoot(drops);
        for (const drop of drops) {
            if (!this.itemTable.has(drop.itemId)) continue;
            const name = this.itemTable.createItem(drop.itemId).name;
            const existing = itemsGained.find((entry) => entry.name === name);
            if (existing) {
                existing.quantity += drop.quantity;
            } else {
                itemsGained.push({ name, quantity: drop.quantity });
            }
        }

        const specialSpawn = this.checkSpecialEncounters(placeId);
        if (specialSpawn) {
            message = `A special encounter appeared: ${specialSpawn.name}!`;
        }

        const united = ['north_resident', 'south_resident'].every((id) =>
            this.team.getAll().some((c) => c.id === id),
        );
        if (united && !this.unlocked.has(FLAGS.EAST_FIELD_UNLOCKED)) {
            this.unlocked.add(FLAGS.EAST_FIELD_UNLOCKED);
            this.unlocked.add(FLAGS.FARO_UNLOCKED);
            unlockedEast = true;
            if (!specialSpawn) {
                message = 'You united the villages! The east road is now open.';
            }
        }

        if (completedMissions.length > 0 && !specialSpawn) {
            const titles = completedMissions
                .map((missionId) => this.missions.mission(missionId)?.title)
                .filter((title): title is string => Boolean(title));
            if (titles.length > 0) {
                message = `${message} Mission complete: ${titles.join(', ')}`;
            }
        }

        if (levelUpNames.length > 0) {
            const names = levelUpNames.join(', ');
            message = `${message} ${names} ${levelUpNames.length === 1 ? 'has' : 'have'} a level up available!`;
        }

        // The teammates that fell stay behind as corpses at the battle
        // place (the player always drags themselves back).
        const fallen = this.faintFallen(placeId, [...participants, ...fighters]);
        if (fallen.length > 0) {
            message = `${message} ${fallen.join(', ')} ${fallen.length === 1 ? 'was' : 'were'} left behind.`;
        }

        this.evaluateStory();

        return {
            message,
            leveled,
            unlockedEast,
            drops,
            specialSpawn,
            report,
            xpRows,
            jobLevelUps: levelUpNames.length > 0 ? levelUpNames : undefined,
            itemsGained: itemsGained.length > 0 ? itemsGained : undefined,
            goldGained,
        };
    }

    exportSave(): SaveData {
        const npcs: SavedNpc[] = [];
        for (const [placeId, list] of this.npcs) {
            for (const npc of list) {
                npcs.push({
                    id: npc.id,
                    placeId,
                    hp: npc.character.stats.hp,
                    isAlive: npc.character.stats.isAlive,
                    // What the npc became between fights: level, xp and
                    // its evolved stats, so a rematch faces the same
                    // opponent instead of a content-fresh copy.
                    level: npc.character.experience.level,
                    currentXp: npc.character.experience.currentXp,
                    stats: {
                        attack: npc.character.stats.attack,
                        defence: npc.character.stats.defence,
                        magicDefence: npc.character.stats.magicDefence,
                        speed: npc.character.stats.speed,
                        magic: npc.character.stats.magic,
                        critChance: npc.character.stats.critChance,
                        critMultiplier: npc.character.stats.critMultiplier,
                    },
                });
            }
        }

        // World npcs that are no longer around (recruited/defeated).
        const removedNpcs: string[] = [];
        for (const [placeId, list] of buildNpcsFromPlaces(PLACES).npcs) {
            for (const npc of list) {
                if (!this.findNpc(npc.id)) removedNpcs.push(npc.id);
            }
        }

        const teamIds = new Set(this.team.getAll().map((character) => character.id));

        // The roster covers everyone: pooled characters plus any team
        // member added outside the roster (legacy flows).
        const rosterPool = [...this.roster.all()];
        for (const character of this.team.getAll()) {
            if (!this.roster.has(character.id)) rosterPool.push(character);
        }

        return {
            version: SAVE_VERSION,
            currentPlaceId: this.currentPlaceId,
            gold: this.team.gold,
            unlocked: Array.from(this.unlocked),
            team: this.team.getAll().map((character) => this.serializeCharacter(character)),
            roster: rosterPool.map((character) => ({
                ...this.serializeCharacter(character),
                active: teamIds.has(character.id),
            })),
            inventory: this.team.inventory.getAllItems().map((slot) => ({
                itemId: slot.item.id,
                quantity: slot.quantity,
                totalQuantity: slot.totalQuantity,
            })),
            npcs,
            removedNpcs,
            encounters: this.encounterTracker.snapshot(),
            spawnedSpecials: Array.from(this.spawnedSpecials),
            skillTrees: Array.from(this.skillTrees).map(([characterId, tree]) => ({
                characterId,
                learned: Array.from(tree.learned),
            })),
            missions: this.missions.serialize(),
            missionBoard: this.missions.serializeBoard(),
            calendarDay: this.calendar.totalDays(),
            flags: this.flags.all(),
            storyHiddenPlaces: Array.from(this.storyHidden),
            story: this.story.snapshot(),
            shops: Array.from(this.shopStock).map(([shopId, remaining]) => ({ shopId, remaining })),
            fainted: this.faints.snapshot(),
            deceased: this.faints.deceasedIds(),
        };
    }

    private serializeCharacter(character: Character): SavedCharacter {
        return {
            id: character.id,
            name: character.name,
            attack: character.stats.attack,
            defence: character.stats.defence,
            hp: character.stats.hp,
            totalHp: character.stats.totalHp,
            isAlive: character.stats.isAlive,
            fatigue: character.stats.fatigue,
            position: character.position,
            level: character.experience.level,
            currentXp: character.experience.currentXp,
            jobId: character.jobId,
            portraitId: character.portraitId,
            // The worldTest stats are part of the enhanced Statistics:
            // read them straight from the stats object.
            extraStats: {
                speed: character.stats.speed,
                magic: character.stats.magic,
                magicDefence: character.stats.magicDefence,
                critChance: character.stats.critChance,
                critMultiplier: character.stats.critMultiplier,
                mana: character.stats.mana,
                totalMana: character.stats.totalMana,
            },
            equipment: Object.entries(character.equipment.getAllSlots())
                .filter(([, item]) => Boolean(item))
                .map(([slot, item]) => ({ slot, itemId: (item as Item).id })),
            loadout: serializeLoadout(character),
            // Job progression: every job's bucket (xp, picks, mastery).
            jobProgress: character.jobProgress ? Object.entries(character.jobProgress).map(
                ([jobId, state]) => ({ jobId, ...state }),
            ) : undefined,
        };
    }

    static fromSave(data: SaveData): WorldSession {
        if (data.version !== SAVE_VERSION) {
            throw new Error(`Unsupported save version: ${data.version}.`);
        }

        const session = new WorldSession();

        const team = new Team();
        const restored: Character[] = [];
        const activeIds: string[] = [];
        const teamIds = data.team.map((saved) => saved.id);

        const restoreCharacter = (saved: SavedCharacter): Character => {
            const character = buildCharacterFromSave(saved);
            // The held job: new saves carry it and the saved stats
            // already include its bonuses. Old saves self-heal by
            // adopting the default job and applying its bonuses once.
            const savedJob = saved.jobId ? jobById(saved.jobId) : undefined;
            const defaultJob = jobOfCharacter(character.id);
            if (savedJob) {
                character.jobId = savedJob.id;
            } else if (defaultJob) {
                character.jobId = defaultJob.id;
                applyJobBonuses(character, defaultJob);
            }
            // The saved stats are authoritative (content-defined
            // characters keep their numbers): only the growth is
            // reattached for future level-ups — the live handler adds
            // the CURRENT job's gains from here on.
            wireCharacterGrowth(character);
            for (const equipment of saved.equipment) {
                if (!session.itemTable.has(equipment.itemId)) continue;
                const item = session.itemTable.createItem(equipment.itemId);
                character.equipment.equipOrReplace(item, character);
            }
            // The five-hole loadout (optional: saves made before it
            // existed keep their legacy equipment only; entries without
            // a hole fill the first free one).
            for (const entry of saved.loadout ?? []) {
                if (!session.itemTable.has(entry.itemId)) continue;
                const hole = typeof entry.hole === 'number' ?
                    entry.hole :
                    firstFreeHole(character);
                equipInto(character, hole, session.itemTable.createItem(entry.itemId));
            }
            // Saves made before the five-hole loadout carry their gear
            // only in the legacy manager; migrate it so the new UI
            // shows it in the holes.
            if (!saved.loadout || saved.loadout.length === 0) {
                migrateLegacyEquipment(character);
            }
            return character;
        };

        if (data.roster) {
            for (const saved of data.roster) {
                const character = restoreCharacter(saved);
                restored.push(character);
                if (saved.active && teamIds.indexOf(character.id) === -1) {
                    activeIds.push(character.id);
                }
            }
            // The team field carries the active party order: it wins.
            session.roster.load(restored, teamIds);
            session.roster.rebuildTeam(team);
        } else {
            // Legacy save: the team is the whole roster, all active.
            for (const saved of data.team) {
                const character = restoreCharacter(saved);
                restored.push(character);
                activeIds.push(character.id);
                team.addCharacter(character);
            }
            session.roster.load(restored, activeIds);
        }

        for (const slot of data.inventory) {
            if (!session.itemTable.has(slot.itemId)) continue;
            const item = session.itemTable.createItem(slot.itemId);
            team.inventory.addItem(item, slot.totalQuantity);
            team.inventory.consumeAvailable(slot.itemId, slot.totalQuantity - slot.quantity);
        }
        team.gold = data.gold;

        // A save from before the act content existed restores no
        // characters at all: seed the act-1 world so the game is
        // playable instead of an empty shell.
        if (session.roster.all().length === 0) {
            const fresh = createInitialWorld();
            session.roster.load(fresh.roster, fresh.team.getAll().map((character) => character.id));
            session.roster.rebuildTeam(team);
            team.gold = fresh.team.gold;
        }

        session.team = team;

        // Places change between worlds: an unknown saved place falls
        // back to the act start instead of crashing the UI.
        session.currentPlaceId = PLACES_BY_ID[data.currentPlaceId] ? data.currentPlaceId : ACT1.startPlaceId;
        session.unlocked = new Set(data.unlocked);

        // The story spine: hidden places and the engine's memory
        // (armed acts, completed acts, applied events).
        session.storyHidden = new Set(data.storyHiddenPlaces ?? []);
        if (data.story) session.story.restore(data.story);

        // npcs: the places define which npcs exist; the save only
        // carries their hp/alive state and which world npcs were
        // permanently removed. World npcs added after the save was made
        // appear automatically at full hp.
        const worldNpcs = buildNpcsFromPlaces(PLACES).npcs;
        const savedById = new Map(data.npcs.map((npc) => [npc.id, npc]));
        const removed = new Set<string>(data.removedNpcs ?? []);

        if (!data.removedNpcs) {
            // Legacy save: removed world npcs are the ones missing from
            // the save whose character joined the team (recruits).
            const teamIds = new Set(data.team.map((character) => character.id));
            for (const [, list] of worldNpcs) {
                for (const npc of list) {
                    if (!savedById.has(npc.id) && teamIds.has(npc.id)) removed.add(npc.id);
                }
            }
        }

        for (const [placeId, list] of worldNpcs) {
            worldNpcs.set(placeId, list.filter((npc) => !removed.has(npc.id)));
        }
        session.npcs = worldNpcs;

        // Applies the saved npc state: battle damage plus what the npc
        // became between fights (level, xp, evolved stats), so a rematch
        // faces the same opponent.
        const applySavedNpc = (npc: NPC, saved: SavedNpc): void => {
            npc.character.stats.hp = saved.hp;
            npc.character.stats.isAlive = saved.isAlive;
            if (saved.level !== undefined) npc.character.experience.level = saved.level;
            if (saved.currentXp !== undefined) npc.character.experience.currentXp = saved.currentXp;
            if (saved.stats) {
                const stats = saved.stats;
                if (stats.attack !== undefined) npc.character.stats.attack = stats.attack;
                if (stats.defence !== undefined) npc.character.stats.defence = stats.defence;
                if (stats.magicDefence !== undefined) npc.character.stats.magicDefence = stats.magicDefence;
                if (stats.speed !== undefined) npc.character.stats.speed = stats.speed;
                if (stats.magic !== undefined) npc.character.stats.magic = stats.magic;
                if (stats.critChance !== undefined) npc.character.stats.critChance = stats.critChance;
                if (stats.critMultiplier !== undefined) npc.character.stats.critMultiplier = stats.critMultiplier;
            }
        };

        for (const npc of session.allNpcs()) {
            const saved = savedById.get(npc.id);
            if (saved) applySavedNpc(npc, saved);
        }

        // In-roster people share their character with the roster entry,
        // so the world (and the dev page) shows exactly the owned
        // character's state: battle damage, XP and fatigue stay in sync
        // everywhere instead of diverging after a save/load. Old saves
        // self-heal: when the restored character has nothing equipped,
        // the content equipment of the world npc is re-applied.
        for (const [, list] of session.npcs) {
            for (const npc of list) {
                const rosterCharacter = session.roster.character(npc.id);
                if (rosterCharacter) {
                    if (equippedItemsOf(rosterCharacter).length === 0) {
                        // Old saves self-heal by re-applying the content
                        // equipment — except weapons the character's held
                        // job cannot wield (a job swap stripped them on
                        // purpose and the save recorded it).
                        const heldJob = heldJobOf(rosterCharacter);
                        for (const item of equippedItemsOf(npc.character)) {
                            if (
                                item.definition.slot === 'weapon' &&
                                heldJob &&
                                !heldJob.allowsWeapon(item.definition.weaponType)
                            ) {
                                continue;
                            }
                            const instance = session.itemTable.createItem(item.id);
                            if (instance.definition.slot) {
                                rosterCharacter.equipment.equipOrReplace(instance, rosterCharacter);
                            } else {
                                equipInto(rosterCharacter, firstFreeHole(rosterCharacter), instance);
                            }
                        }
                        // The new UI shows the five-hole loadout: move
                        // the re-applied gear out of the legacy manager.
                        migrateLegacyEquipment(rosterCharacter);
                    }
                    npc.character = rosterCharacter;
                }
            }
        }

        // Missions move people around (npcMoves): honor the saved
        // placements so a travel-with-mission npc stays where it was.
        for (const saved of data.npcs) {
            if (!session.npcs.has(saved.placeId)) continue; // place is gone
            const npc = session.findNpc(saved.id);
            if (!npc) continue;
            const inSavedPlace = session.npcsAt(saved.placeId).some((entry) => entry.id === npc.id);
            if (!inSavedPlace) session.moveNpc(saved.id, saved.placeId);
        }

        for (const saved of data.npcs) {
            if (session.findNpc(saved.id)) continue;
            // A dynamically spawned special encounter.
            const special = session.specials.find((entry) => entry.id === saved.id);
            if (special) {
                const npc = buildSpecialNpc(special);
                applySavedNpc(npc, saved);
                const list = session.npcs.get(saved.placeId) ?? [];
                list.push(npc);
                session.npcs.set(saved.placeId, list);
            }
        }

        for (const entry of data.encounters) {
            session.encounterTracker.setVictories(entry.placeId, entry.victories);
        }
        session.spawnedSpecials = new Set(data.spawnedSpecials);

        for (const entry of data.skillTrees) {
            const tree = session.skillTreeOf(entry.characterId);
            if (tree) {
                for (const nodeId of entry.learned) {
                    tree.learned.add(nodeId);
                }
            }
        }

        session.missions.load(data.missions ?? []);
        if (data.missionBoard && data.missionBoard.length > 0) {
            session.missions.loadBoard(data.missionBoard);
        }
        session.calendar.restore(data.calendarDay ?? 0);

        // Fainting: restore the fallen records, keep them out of the
        // active party, re-apply the carry penalties to the carriers
        // (statuses are not serialized), and let the week expire anyone
        // whose corpse waited through the save's absence.
        session.faints.restore(data.fainted ?? [], data.deceased ?? []);
        for (const entry of session.faints.all()) {
            if (!session.roster.character(entry.characterId)) continue;
            session.roster.deactivate(entry.characterId);
            if (entry.carriedBy) {
                const carrier = session.team.getCharacter(entry.carriedBy) ??
                    session.roster.character(entry.carriedBy);
                if (carrier) applyCarryStatus(carrier);
            }
        }
        session.roster.rebuildTeam(team);
        session.expireCorpses();

        // A mid-mission story beat (dialogue + queued battle) survives a
        // load: replay the lines and re-queue the battle that follows.
        for (const runner of session.missions.activeMissions()) {
            const step = runner.current();
            if (!step || step.kind !== 'dialogue' || !step.battle) continue;
            if (step.lines && step.lines.length > 0) {
                session.messages.push(step.lines);
            }
            while (runner.current() === step && runner.dialogueLine()) {
                runner.advanceDialogue();
            }
            session.pendingBattleRef = {
                fightId: step.battle.fightId,
                placeId: step.battle.placeId,
                missionId: runner.missionId(),
            };
        }

        // Missions generate people (unitSpawns): re-apply them for
        // active missions, so a save/load never loses the generated
        // units (their ids make the re-apply idempotent).
        session.ensureMissionUnits();
        // Rebuild the flag registry: from the save when it exists, and
        // always from the mission snapshots (covers old saves that only
        // carried flags inside missions, and world-event flags).
        session.flags.restore(data.flags ?? []);
        for (const flag of session.missions.allFlags()) {
            session.flags.set(flag);
        }
        // Restore the shop stock: saved shops keep their remaining
        // entries (unknown items/ids dropped); shops added after the
        // save was made open with their full stock.
        for (const saved of data.shops ?? []) {
            if (!SHOPS[saved.shopId]) continue;
            const valid: string[] = [];
            for (const itemId of saved.remaining) {
                if (session.itemTable.has(itemId) && valid.indexOf(itemId) === -1) {
                    valid.push(itemId);
                }
            }
            session.shopStock.set(saved.shopId, valid);
        }

        // Saves made before the test bag existed got it seeded once;
        // the bag is gone now — new games start with an empty bag.
        return session;
    }
}

/**
 * The loadout as save entries (one per equipped slot). Undefined when
 * the character never used the loadout.
 */
function serializeLoadout(character: Character): SavedCharacter['loadout'] {
    const loadout: CharacterLoadout | undefined = character.loadout;
    if (!loadout) return undefined;
    const entries: { hole: number; itemId: string }[] = [];
    for (let index = 0; index < loadout.holes.length; index++) {
        const item = loadout.holes[index];
        if (item) {
            entries.push({ hole: index, itemId: item.id });
        }
    }
    return entries;
}
