import { Team } from '../../src';
import type { Character, InventorySlot, Item } from '../../src';
import type { EquipmentSlot } from '../../src/classes/items/EquipmentManager';
import { PLACES_BY_ID, createInitialNpcs, createInitialWorld } from './world';
import { buyItem, sellItem } from './shop';
import { equipToCharacter, unequipFromCharacter, useItemOn } from './inventory';
import { grantCombatXp } from './xp/xpSystem';
import { SAVE_VERSION } from './save/saveData';
import type { SaveData, SavedNpc } from './save/saveData';
import { buildCharacterFromSave } from './save/saveSystem';
import { DEFAULT_ITEM_TABLE } from './items';
import { LootRoller } from './loot/lootRoller';
import type { LootDrop } from './loot/lootRoller';
import type { DropTable } from './loot/dropTable';
import { EncounterTracker } from './encounters/encounterTracker';
import { SPECIAL_ENCOUNTERS, buildSpecialNpc } from './encounters/specialEncounter';
import { skillIdsOf } from './skills';
import { SkillTree } from './skillTree/skillTree';
import { createCompanionTree, createHeroTree } from './skillTree/trees';
import { GROWTH, applyGrowthAtLevel, jobIdOf, wireGrowth } from './config/growth';
import type { NPC, Place, ShopEntry } from './types';

export type CombatEndContext = {
    npc?: NPC;
    placeId: string;
    // Which ally landed the killing blow on each defeated enemy.
    kills?: { enemyId: string; killerId: string }[];
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
    private lootRoller: LootRoller;
    private encounterTracker = new EncounterTracker();
    private spawnedSpecials = new Set<string>();
    private npcs: Map<string, NPC[]>;
    private skillTrees: Map<string, SkillTree> = new Map([
        ['hero', createHeroTree()],
        ['companion', createCompanionTree()],
    ]);
    currentPlaceId: string = 'central_town';
    unlocked: Set<string> = new Set();

    constructor(options: { random?: () => number } = {}) {
        const initial = createInitialWorld();
        this.team = initial.team;
        this.npcs = initial.npcs;
        this.lootRoller = new LootRoller(options.random ?? Math.random);
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

    travel(to: string): { ok: boolean; message?: string } {
        const connection = this.currentPlace.connections.find((c) => c.to === to);
        if (!connection) {
            return { ok: false, message: 'You cannot travel there.' };
        }
        if (connection.requiredFlag && !this.unlocked.has(connection.requiredFlag)) {
            return { ok: false, message: connection.lockedMessage ?? 'The way is closed.' };
        }

        this.currentPlaceId = to;
        return { ok: true };
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

    buy(entry: ShopEntry): 'ok' | 'no_gold' {
        return buyItem(this.team, entry);
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

    // Base skills plus the skills granted by learned tree nodes.
    availableSkillIds(character: Character): string[] {
        const base = skillIdsOf(character.id);
        const tree = this.skillTreeOf(character.id);
        const learned = tree ? tree.learnedSkillIds() : [];
        return [...base, ...learned];
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
            // Drops referencing items outside the catalog are skipped:
            // loot tables may outlive the item catalog during rebuilds.
            if (!this.itemTable.has(drop.itemId)) continue;
            this.team.inventory.addItem(this.itemTable.createItem(drop.itemId), drop.quantity);
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

    finishCombat(result: 'won' | 'lost', context: CombatEndContext): CombatEndResult {
        if (result === 'lost') {
            this.currentPlaceId = 'central_town';
            for (const member of this.team.getAll()) {
                member.stats.hp = 1;
                member.stats.isAlive = 1;
            }
            // The world resets: the fought npc recovers so the rematch is fair.
            if (context.npc) {
                context.npc.character.stats.hp = context.npc.character.stats.totalHp;
                context.npc.character.stats.isAlive = 1;
            }
            return {
                message: 'Your party was defeated. You wake up in Central Town.',
                leveled: false,
                unlockedEast: false,
                drops: [],
                specialSpawn: null,
            };
        }

        const { npc, placeId } = context;
        this.encounterTracker.recordVictory(placeId);

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
                const grants = grantCombatXp({ killer, allies: this.team.getAlive(), creatureLevel: 1 });
                totalXp += grants.reduce((sum, grant) => sum + grant.gained, 0);
                if (grants.some((grant) => grant.levels > 0)) anyLeveled = true;
            };

            if (kills.length > 0) {
                for (const kill of kills) {
                    const killer = this.team.getCharacter(kill.killerId);
                    if (killer) grantForKiller(killer);
                }
            } else {
                const fallback = this.team.getAlive()[0];
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
        for (const [placeId, list] of createInitialNpcs()) {
            for (const npc of list) {
                if (!this.findNpc(npc.id)) removedNpcs.push(npc.id);
            }
        }

        return {
            version: SAVE_VERSION,
            currentPlaceId: this.currentPlaceId,
            gold: this.team.gold,
            unlocked: Array.from(this.unlocked),
            team: this.team.getAll().map((character) => ({
                id: character.id,
                name: character.name,
                attack: character.stats.attack,
                defence: character.stats.defence,
                hp: character.stats.hp,
                totalHp: character.stats.totalHp,
                isAlive: character.stats.isAlive,
                level: character.experience.level,
                currentXp: character.experience.currentXp,
                equipment: Object.entries(character.equipment.getAllSlots())
                    .filter(([, item]) => Boolean(item))
                    .map(([slot, item]) => ({ slot, itemId: (item as Item).id })),
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
        };
    }

    static fromSave(data: SaveData): WorldSession {
        if (data.version !== SAVE_VERSION) {
            throw new Error(`Unsupported save version: ${data.version}.`);
        }

        const session = new WorldSession();

        const team = new Team();
        for (const saved of data.team) {
            const character = buildCharacterFromSave(saved);
            // Normalize stats to the deterministic growth curve for the
            // saved level (hp is preserved) and reattach the growth.
            applyGrowthAtLevel(character, jobIdOf(character.id), character.experience.level, false);
            wireGrowth(character, jobIdOf(character.id));
            team.addCharacter(character);
            for (const equipment of saved.equipment) {
                if (!session.itemTable.has(equipment.itemId)) continue;
                const item = session.itemTable.createItem(equipment.itemId);
                character.equipment.equipOrReplace(item, character);
            }
        }
        for (const slot of data.inventory) {
            if (!session.itemTable.has(slot.itemId)) continue;
            const item = session.itemTable.createItem(slot.itemId);
            team.inventory.addItem(item, slot.totalQuantity);
            team.inventory.consumeAvailable(slot.itemId, slot.totalQuantity - slot.quantity);
        }
        team.gold = data.gold;
        session.team = team;

        session.currentPlaceId = data.currentPlaceId;
        session.unlocked = new Set(data.unlocked);

        // npcs: the current world defines which npcs exist; the save only
        // carries their hp/alive state and which world npcs were
        // permanently removed. World npcs added after the save was made
        // (new fights, new dummies...) appear automatically at full hp.
        const initial = createInitialWorld();
        const savedById = new Map(data.npcs.map((npc) => [npc.id, npc]));
        const removed = new Set<string>(data.removedNpcs ?? []);

        if (!data.removedNpcs) {
            // Legacy save: removed world npcs are the ones missing from
            // the save whose character joined the team (recruits).
            const teamIds = new Set(data.team.map((character) => character.id));
            for (const [, list] of initial.npcs) {
                for (const npc of list) {
                    if (!savedById.has(npc.id) && teamIds.has(npc.id)) removed.add(npc.id);
                }
            }
        }

        for (const [placeId, list] of initial.npcs) {
            initial.npcs.set(placeId, list.filter((npc) => !removed.has(npc.id)));
        }
        session.npcs = initial.npcs;

        for (const npc of session.allNpcs()) {
            const saved = savedById.get(npc.id);
            if (saved) {
                npc.character.stats.hp = saved.hp;
                npc.character.stats.isAlive = saved.isAlive;
            }
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

        return session;
    }
}
