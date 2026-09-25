import { Character, Stats, Team } from '../../src';
import type { InventorySlot, Item, TeamPosition } from '../../src';
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
import { SkillTree } from './skillTree/skillTree';
import { createCompanionTree, createHeroTree } from './skillTree/trees';
import { GROWTH, applyGrowthAtLevel, jobIdOf, wireGrowth } from './config/growth';
import { Roster } from './roster';
import { addItemCapped, canAddItem } from './inventory';
import { MissionManager } from './missions';
import type { Mission, MissionStep } from './missions';
import { ACT1 } from './config/act1';
import { CHATS } from './config/chats';
import { FIGHTS } from './config/fights';
import { SHOPS } from './config/shops';
import { GameCalendar } from './calendar';
import { FlagRegistry } from './flags';
import { MessageQueue } from './messages';
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
};
export type CombatEndResult = {
    message: string;
    leveled: boolean;
    unlockedEast: boolean;
    drops: LootDrop[];
    specialSpawn?: { id: string; name: string } | null;
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
    // Remaining stock per shop (bought entries are removed; an emptied
    // shop closes). Initialized from the SHOPS content.
    private shopStock = new Map<string, string[]>();
    // Global story messages: arrival events push lines here and the web
    // shows them over everything. Not part of the save.
    readonly messages = new MessageQueue();
    // A battle an arrival event queued: it starts once the messages are
    // read. Consumed by the web; not part of the save.
    private pendingBattleRef: { fightId: string; placeId: string; missionId: string } | null = null;

    constructor(options: { random?: () => number } = {}) {
        const initial = createInitialWorld();
        this.team = initial.team;
        this.npcs = initial.npcs;
        this.roster.load(
            initial.roster,
            initial.roster.filter((character) => this.team.getCharacter(character.id)).map((character) => character.id),
        );
        this.lootRoller = new LootRoller(options.random ?? Math.random);
        this.missions = new MissionManager(
            options.random ?? Math.random,
            (flags) => {
                for (const flag of flags) this.flags.set(flag);
            },
        );
        for (const mission of createInitialMissions()) {
            this.missions.register(mission);
        }

        // Shops open with their full content stock.
        for (const shop of Object.values(SHOPS)) {
            this.shopStock.set(shop.id, shop.stock.map((entry) => entry.itemId));
        }
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

    travel(to: string): { ok: boolean; message?: string; arrival?: boolean } {
        const connection = this.currentPlace.connections.find((c) => c.to === to);
        if (!connection) {
            return { ok: false, message: 'You cannot travel there.' };
        }
        if (connection.requiredFlag && !this.unlocked.has(connection.requiredFlag)) {
            return { ok: false, message: connection.lockedMessage ?? 'The way is closed.' };
        }
        if (connection.requiredMissionId
            && !this.missionIsActive(connection.requiredMissionId)) {
            return { ok: false, message: connection.lockedMessage ?? 'A mission is needed to go there.' };
        }
        if (!this.missions.travelAllowedTo(to)) {
            return { ok: false, message: 'Your mission does not lead there.' };
        }

        this.currentPlaceId = to;
        // Travel to another place takes a day.
        this.calendar.advance();
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
                if (chat) this.messages.push(chat.lines);
                this.pendingBattleRef = {
                    fightId: arrivalEvent.fightId,
                    placeId: to,
                    missionId: arrivalEvent.missionId,
                };
                arrival = true;
            }
        }

        return {
            ok: true,
            message: titles.length > 0 ? `Mission complete: ${titles.join(', ')}` : undefined,
            arrival,
        };
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
     * Starts a registered mission on behalf of a character (the user's
     * party member that accepted it). Refused when its requirements
     * (gold / items owned) are not met.
     */
    startMission(missionId: string, characterId: string = 'player'): boolean {
        const mission = this.missions.mission(missionId);
        const met = mission ? this.missionRequirementsMet(missionId) : { ok: false as const, reason: 'Unknown mission.' };
        if (!met.ok) return false;

        const runner = this.missions.start(missionId, characterId);
        if (runner && mission) {
            for (const move of mission.npcMoves ?? []) {
                this.moveNpc(move.npcId, move.toPlaceId);
            }
            this.applyUnitMoves(mission);
            this.applyUnitSpawns(mission);
        }
        return Boolean(runner);
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
            const next = Math.min(GROWTH.levelCap, member.experience.level + levels);
            if (next === member.experience.level) {
                summary.push(`${member.name} (max Lv ${GROWTH.levelCap})`);
                continue;
            }
            member.experience.level = next;
            member.experience.currentXp = 0;
            applyGrowthAtLevel(member, jobIdOf(member.id), next);
            summary.push(`${member.name} Lv ${next}`);
        }
        return { message: `💪 ${summary.join(' · ')}` };
    }

    /**
     * Adds a character to the roster (joining the active party while
     * there is room) and refreshes the team.
     */
    addRosterCharacter(character: Character): void {
        this.roster.add(character);
        this.roster.rebuildTeam(this.team);
    }

    /**
     * Replaces the active party with the given roster ids.
     */
    setActiveParty(ids: string[]): { ok: boolean; message: string } {
        this.roster.setActive(ids);
        this.roster.rebuildTeam(this.team);
        const names = this.team.getAll().map((character) => character.name).join(', ');
        return { ok: this.team.count() > 0, message: names ? `Active party: ${names}` : 'Active party is empty.' };
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

    removeRosterCharacter(id: string): void {
        this.roster.remove(id);
        this.roster.rebuildTeam(this.team);
    }

    /**
     * Performs a place task (chopping wood, collecting hay...): adds the
     * reward to the shared inventory when capacity allows, and reports
     * the task to missions so matching steps complete.
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
        const character = this.team.getCharacter(characterId);
        if (!character) return false;
        return equipToCharacter(this.team.inventory, character, itemId);
    }

    unequipFrom(characterId: string, slot: EquipmentSlot): boolean {
        const character = this.team.getCharacter(characterId);
        if (!character) return false;
        return unequipFromCharacter(this.team.inventory, character, slot);
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
    // granted by learned tree nodes.
    availableSkillIds(character: Character): string[] {
        const base = skillIdsOf(character.id);
        const tree = this.skillTreeOf(character.id);
        const learned = tree ? tree.learnedSkillIds() : [];
        return [...defaultSkillIds(), ...base, ...learned];
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

            const triggered = special.repeat === 'once'
                ? count === special.triggerAfter
                : count % special.triggerAfter === 0;

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
        const failedMissionTitles = fightMission?.isFailed() ? [fightMission.title()] : [];

        if (result === 'fled') {
            // Running away: no rewards, no punishment, the fought npc
            // recovers so the rematch is fair. Missions see the outcome.
            if (context.npc) {
                context.npc.character.stats.hp = context.npc.character.stats.totalHp;
                context.npc.character.stats.isAlive = 1;
            }
            this.missions.reportBattle('fled');
            return {
                message: failedMissionTitles.length > 0
                    ? `You fled the battle. Mission failed: ${failedMissionTitles.join(', ')}`
                    : 'You fled the battle.',
                leveled: false,
                unlockedEast: false,
                drops: [],
                specialSpawn: null,
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
            return {
                message: failedMissionTitles.length > 0
                    ? `Your party was defeated. You wake up in Central Town. Mission failed: ${failedMissionTitles.join(', ')}`
                    : 'Your party was defeated. You wake up in Central Town.',
                leveled: false,
                unlockedEast: false,
                drops: [],
                specialSpawn: null,
            };
        }

        const completedMissions = this.missions.reportBattle('won');

        // Missions finished by the victory: the people that travelled
        // with them go back home.
        for (const missionId of completedMissions) {
            this.revertMissionMoves(missionId);
        }

        // A won battle can open the mission's next beat: mid-mission
        // dialogue goes to the global message box, and the battle that
        // follows is queued (it starts once the lines are read).
        if (fightMission && !fightMission.isComplete() && !fightMission.isFailed()) {
            const beat = fightMission.current();
            if (beat && beat.kind === 'dialogue' && beat.battle) {
                if (beat.lines && beat.lines.length > 0) {
                    this.messages.push(beat.lines);
                }
                while (fightMission.current() === beat && fightMission.dialogueLine()) {
                    fightMission.advanceDialogue();
                }
                this.pendingBattleRef = {
                    fightId: beat.battle.fightId,
                    placeId: beat.battle.placeId,
                    missionId: fightMission.missionId(),
                };
            } else if (beat && beat.kind === 'wait_battle' && beat.battle) {
                // No dialogue between battles: queue it right away.
                this.pendingBattleRef = {
                    fightId: beat.battle.fightId,
                    placeId: beat.battle.placeId,
                    missionId: fightMission.missionId(),
                };
            }
        }

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
            this.team.getCharacter(killerId)
            ?? participants.find((character) => character.id === killerId)
            ?? fighters.find((fighter) => fighter.id === killerId);

        let leveled: boolean;
        let message: string;
        let unlockedEast = false;

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
            this.team.gold += npc.goldReward;

            if (npc.recruitOnDefeat) {
                npc.character.stats.hp = 1;
                npc.character.stats.isAlive = 1;
                this.team.addCharacter(npc.character);
                this.removeNpcFromPlace(placeId, npc.id);
            } else if (npc.respawns) {
                npc.character.stats.hp = npc.character.stats.totalHp;
                npc.character.stats.isAlive = 1;
            } else {
                this.removeNpcFromPlace(placeId, npc.id);
            }

            const xpSummary = xpGrants.map((grant) => `${grant.character.name} +${grant.gained} XP`).join(' · ');
            message = npc.recruitOnDefeat
                ? `${npc.character.name} joined your party!`
                : leveled
                    ? `Victory! +${npc.goldReward}g · ${xpSummary} · leveled up!`
                    : `Victory! +${npc.goldReward}g · ${xpSummary}.`;
        } else {
            const kills = context.kills ?? [];
            let anyLeveled = false;
            let totalXp = 0;
            const grantForKiller = (killer: Character) => {
                const grants = grantCombatXp({ killer, allies: battleAllies, creatureLevel: 1 });
                totalXp += grants.reduce((sum, grant) => sum + grant.gained, 0);
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
            message = leveled ? `Victory! ${totalXp} XP total — someone leveled up!` : `Victory! ${totalXp} XP total.`;
        }

        const drops = this.rollLoot(npc ? npc.dropTable : undefined);
        this.grantLoot(drops);

        const specialSpawn = this.checkSpecialEncounters(placeId);
        if (specialSpawn) {
            message = `A special encounter appeared: ${specialSpawn.name}!`;
        }

        const united = ['north_resident', 'south_resident'].every((id) =>
            this.team.getAll().some((c) => c.id === id),
        );
        if (united && !this.unlocked.has('east_unlocked')) {
            this.unlocked.add('east_unlocked');
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

        return { message, leveled, unlockedEast, drops, specialSpawn };
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
            calendarDay: this.calendar.totalDays(),
            flags: this.flags.all(),
            shops: Array.from(this.shopStock).map(([shopId, remaining]) => ({ shopId, remaining })),
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
            equipment: Object.entries(character.equipment.getAllSlots())
                .filter(([, item]) => Boolean(item))
                .map(([slot, item]) => ({ slot, itemId: (item as Item).id })),
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
            // Normalize stats to the deterministic growth curve for the
            // saved level (hp is preserved) and reattach the growth.
            applyGrowthAtLevel(character, jobIdOf(character.id), character.experience.level, false);
            wireGrowth(character, jobIdOf(character.id));
            for (const equipment of saved.equipment) {
                if (!session.itemTable.has(equipment.itemId)) continue;
                const item = session.itemTable.createItem(equipment.itemId);
                character.equipment.equipOrReplace(item, character);
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

        for (const npc of session.allNpcs()) {
            const saved = savedById.get(npc.id);
            if (saved) {
                npc.character.stats.hp = saved.hp;
                npc.character.stats.isAlive = saved.isAlive;
            }
        }

        // In-roster people share their character with the roster entry,
        // so the world (and the dev page) shows exactly the owned
        // character's state: battle damage, XP and fatigue stay in sync
        // everywhere instead of diverging after a save/load.
        for (const [, list] of session.npcs) {
            for (const npc of list) {
                const rosterCharacter = session.roster.character(npc.id);
                if (rosterCharacter) npc.character = rosterCharacter;
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
                npc.character.stats.hp = saved.hp;
                npc.character.stats.isAlive = saved.isAlive;
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
        session.calendar.restore(data.calendarDay ?? 0);

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

        return session;
    }
}
