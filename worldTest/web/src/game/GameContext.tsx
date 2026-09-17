import { createContext, useContext, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Character, InventorySlot, Item, Team } from '@rpg';
import { PLACES_BY_ID, createInitialWorld } from './data';
import type { NPC, Place, Route, ShopEntry } from './types';

export type CombatContext = { npc?: NPC; placeId: string };

type GameApi = {
    team: Team;
    currentPlace: Place;
    npcsAtCurrent: NPC[];
    unlocked: Set<string>;
    routes: Route[];
    current: Route;
    toast: string | null;
    navigate: (route: Route) => void;
    back: () => void;
    showToast: (message: string) => void;
    travel: (to: string) => void;
    rest: () => void;
    buy: (entry: ShopEntry) => void;
    sell: (slot: InventorySlot) => void;
    equipTo: (item: Item, characterId: string) => void;
    useOn: (slot: InventorySlot, characterId: string) => void;
    findNpc: (npcId: string) => NPC | undefined;
    finishCombat: (result: 'won' | 'lost', context: CombatContext) => void;
    refresh: () => void;
};

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
    const worldRef = useRef<ReturnType<typeof createInitialWorld>>();
    if (!worldRef.current) {
        worldRef.current = createInitialWorld();
    }

    const [currentPlaceId, setCurrentPlaceId] = useState('central_town');
    const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set());
    const [routes, setRoutes] = useState<Route[]>([{ name: 'place' }]);
    const [toast, setToast] = useState<string | null>(null);
    const [version, bump] = useReducer((x: number) => x + 1, 0);
    const toastTimer = useRef<number | undefined>(undefined);

    const { team, npcs } = worldRef.current;

    const current = routes[routes.length - 1];
    const currentPlace = PLACES_BY_ID[currentPlaceId];
    const npcsAtCurrent = npcs.get(currentPlaceId) ?? [];

    const showToast = (message: string) => {
        setToast(message);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 2400);
    };

    const navigate = (route: Route) => setRoutes((rs) => [...rs, route]);
    const back = () => setRoutes((rs) => (rs.length > 1 ? rs.slice(0, -1) : rs));

    const travel = (to: string) => {
        const conn = currentPlace.connections.find((c) => c.to === to);
        if (!conn) return;
        if (conn.requiredFlag && !unlocked.has(conn.requiredFlag)) {
            showToast(conn.lockedMessage ?? 'The way is closed.');
            return;
        }
        setCurrentPlaceId(to);
    };

    const rest = () => {
        for (const member of team.getAll()) {
            member.stats.hp = member.stats.totalHp;
            member.stats.isAlive = 1;
        }
        bump();
        showToast('Your party is fully rested.');
    };

    const buy = (entry: ShopEntry) => {
        if (team.gold < entry.buyPrice) {
            showToast('Not enough gold.');
            return;
        }
        team.gold -= entry.buyPrice;
        team.inventory.addItem(entry.item);
        bump();
        showToast(`Purchased ${entry.item.name}.`);
    };

    const sell = (slot: InventorySlot) => {
        team.gold += slot.item.sellValue;
        team.inventory.removeItem(slot.item.id, 1);
        bump();
        showToast(`Sold ${slot.item.name}.`);
    };

    const equipTo = (item: Item, characterId: string) => {
        const character = team.getCharacter(characterId);
        if (!character || item.category !== 'equipment') return;
        character.equipment.equipOrReplace(item, character);
        bump();
        showToast(`Equipped ${item.name} on ${character.name}.`);
    };

    const useOn = (slot: InventorySlot, characterId: string) => {
        const character = team.getCharacter(characterId);
        if (!character) return;
        const consumed = team.inventory.useItem(slot.id, character);
        bump();
        showToast(consumed ? `${character.name} used ${slot.item.name}.` : 'Could not use that item.');
    };

    const findNpc = (npcId: string): NPC | undefined => {
        for (const list of npcs.values()) {
            const found = list.find((n) => n.id === npcId);
            if (found) return found;
        }
        return undefined;
    };

    const shareExperience = (characters: Character[], xp: number): number => {
        let levels = 0;
        for (const member of characters) {
            levels += member.experience.gain(xp / characters.length);
        }
        return levels;
    };

    const finishCombat = (result: 'won' | 'lost', context: CombatContext) => {
        if (result === 'lost') {
            setCurrentPlaceId('central_town');
            for (const member of team.getAll()) {
                member.stats.hp = 1;
                member.stats.isAlive = 1;
            }
            bump();
            showToast('Your party was defeated. You wake up in Central Town.');
            back();
            return;
        }

        const { npc, placeId } = context;

        if (npc) {
            const levels = shareExperience(team.getAlive(), npc.xpReward);
            team.gold += npc.goldReward;

            if (npc.recruitOnDefeat) {
                npc.character.stats.hp = 1;
                npc.character.stats.isAlive = 1;
                team.addCharacter(npc.character);
            }

            const list = npcs.get(placeId) ?? [];
            npcs.set(placeId, list.filter((n) => n.id !== npc.id));

            const united = ['north_resident', 'south_resident'].every((id) =>
                team.getAll().some((c) => c.id === id),
            );

            if (npc.recruitOnDefeat) {
                showToast(`${npc.character.name} joined your party!`);
            }

            if (united && !unlocked.has('east_unlocked')) {
                setUnlocked((prev) => new Set(prev).add('east_unlocked'));
                showToast('You united the villages! The east road is now open.');
            } else if (levels > 0) {
                showToast(`Victory! +${npc.goldReward}g, +${npc.xpReward} XP, leveled up!`);
            } else {
                showToast(`Victory! +${npc.goldReward}g, +${npc.xpReward} XP.`);
            }
        } else {
            const levels = shareExperience(team.getAlive(), 40);
            team.gold += 15;
            showToast(levels > 0 ? 'Victory over the bandits! Someone leveled up.' : 'Victory over the bandits!');
        }

        bump();
        back();
    };

    const api = useMemo<GameApi>(
        () => ({
            team,
            currentPlace,
            npcsAtCurrent,
            unlocked,
            routes,
            current,
            toast,
            navigate,
            back,
            showToast,
            travel,
            rest,
            buy,
            sell,
            equipTo,
            useOn,
            findNpc,
            finishCombat,
            refresh: bump,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [version, currentPlace, npcsAtCurrent, unlocked, routes, current, toast],
    );

    return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGame must be used within a GameProvider');
    return ctx;
}
