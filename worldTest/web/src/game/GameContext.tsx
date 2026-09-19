import { createContext, useContext, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { InventorySlot, Team } from '@rpg';
import { WorldSession } from '@core';
import type { NPC, Place, SaveData, ShopEntry } from '@core';

const SAVE_KEY = 'rpg-ts-save-v1';

function loadSave(): SaveData | null {
    try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        return raw ? (JSON.parse(raw) as SaveData) : null;
    } catch {
        return null;
    }
}

export type Route =
    | { name: 'place' }
    | { name: 'team' }
    | { name: 'character'; characterId: string }
    | { name: 'inventory' }
    | { name: 'shop' }
    | { name: 'combat'; npcId?: string; placeId: string; group?: boolean; groupId?: string }
    | { name: 'npc'; npcId: string; placeId: string }
    | { name: 'skilltree'; characterId: string }
    | { name: 'map' }
    | { name: 'loot' }
    | { name: 'interval' };

type GameApi = {
    session: WorldSession;
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
    save: () => void;
    travel: (to: string) => void;
    rest: () => void;
    buy: (entry: ShopEntry) => void;
    sell: (slot: InventorySlot) => void;
    equipTo: (itemId: string, characterId: string) => void;
    useOn: (slot: InventorySlot, characterId: string) => void;
    findNpc: (npcId: string) => NPC | undefined;
    refresh: () => void;
};

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
    const sessionRef = useRef<WorldSession>();
    if (!sessionRef.current) {
        const saved = loadSave();
        sessionRef.current = saved ? WorldSession.fromSave(saved) : new WorldSession();
    }
    const session = sessionRef.current;

    const [routes, setRoutes] = useState<Route[]>([{ name: 'place' }]);
    const [toast, setToast] = useState<string | null>(null);
    const [version, bump] = useReducer((x: number) => x + 1, 0);
    const toastTimer = useRef<number | undefined>(undefined);

    const current = routes[routes.length - 1];
    const currentPlace = session.currentPlace;
    const npcsAtCurrent = session.npcsAt(session.currentPlaceId);

    const showToast = (message: string) => {
        setToast(message);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 2400);
    };

    const navigate = (route: Route) => setRoutes((rs) => [...rs, route]);
    const back = () => setRoutes((rs) => (rs.length > 1 ? rs.slice(0, -1) : rs));

    const save = () => {
        try {
            window.localStorage.setItem(SAVE_KEY, JSON.stringify(session.exportSave()));
            showToast('Game saved.');
        } catch {
            showToast('Could not save.');
        }
    };

    const travel = (to: string) => {
        const result = session.travel(to);
        if (!result.ok && result.message) showToast(result.message);
        bump();
    };

    const rest = () => {
        session.rest();
        bump();
        showToast('Your party is fully rested.');
    };

    const buy = (entry: ShopEntry) => {
        const result = session.buy(entry);
        bump();
        showToast(result === 'ok' ? `Purchased ${entry.item.name}.` : 'Not enough gold.');
    };

    const sell = (slot: InventorySlot) => {
        const ok = session.sell(slot);
        bump();
        showToast(ok ? `Sold ${slot.item.name}.` : 'No available copies to sell.');
    };

    const equipTo = (itemId: string, characterId: string) => {
        const character = session.team.getCharacter(characterId);
        const item = session.team.inventory.getItemSlotByItemId(itemId)?.item;
        const ok = session.equipTo(itemId, characterId);
        bump();
        showToast(ok && character && item ? `Equipped ${item.name} on ${character.name}.` : 'Nothing available to equip.');
    };

    const useOn = (slot: InventorySlot, characterId: string) => {
        const character = session.team.getCharacter(characterId);
        const ok = session.useOn(slot, characterId);
        bump();
        showToast(ok && character ? `${character.name} used ${slot.item.name}.` : 'Could not use that item.');
    };

    const api = useMemo<GameApi>(
        () => ({
            session,
            team: session.team,
            currentPlace,
            npcsAtCurrent,
            unlocked: session.unlocked,
            routes,
            current,
            toast,
            navigate,
            back,
            showToast,
            save,
            travel,
            rest,
            buy,
            sell,
            equipTo,
            useOn,
            findNpc: session.findNpc.bind(session),
            refresh: bump,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [version, currentPlace, npcsAtCurrent, routes, current, toast],
    );

    return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGame must be used within a GameProvider');
    return ctx;
}
