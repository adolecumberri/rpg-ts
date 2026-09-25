import { createContext, useContext, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { InventorySlot, Team, TeamPosition } from '@rpg';
import { WorldSession } from '@core';
import type { NPC, Place, SaveData, ShopEntry } from '@core';
import { TOAST_MS } from '../constants/toast';

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
    | { name: 'shop'; shopId?: string }
    | { name: 'settings' }
    | { name: 'combat'; npcId?: string; placeId: string; fightId?: string; missionId?: string }
    | { name: 'hybrid'; placeId: string; fightId?: string; missionId?: string }
    | { name: 'npc'; npcId: string; placeId: string }
    | { name: 'skilltree'; characterId: string }
    | { name: 'skills' }
    | { name: 'board' }
    | { name: 'mission'; missionId: string }
    | { name: 'map' }
    | { name: 'loot' }
    | { name: 'dev' }
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
    // Resets navigation to the current place screen (used after travel).
    openPlace: () => void;
    showToast: (message: string, durationMs?: number) => void;
    save: () => void;
    rest: () => void;
    buy: (shopId: string | undefined, entry: ShopEntry) => void;
    sell: (slot: InventorySlot) => void;
    equipTo: (itemId: string, characterId: string) => void;
    useOn: (slot: InventorySlot, characterId: string) => void;
    setPosition: (characterId: string, position: TeamPosition) => void;
    findNpc: (npcId: string) => NPC | undefined;
    refresh: () => void;
    load: () => void;
};

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
    const sessionRef = useRef<WorldSession>();
    if (!sessionRef.current) {
        let session: WorldSession;
        try {
            const saved = loadSave();
            session = saved ? WorldSession.fromSave(saved) : new WorldSession();
        } catch {
            // A save referencing removed content (old worlds, wiped item
            // catalogs) cannot be restored: start fresh.
            session = new WorldSession();
            try {
                window.localStorage.removeItem(SAVE_KEY);
            } catch {
                // storage unavailable: nothing to clean
            }
        }
        sessionRef.current = session;
    }
    const session = sessionRef.current;

    const [routes, setRoutes] = useState<Route[]>([{ name: 'place' }]);
    const [toast, setToast] = useState<string | null>(null);
    const [version, bump] = useReducer((x: number) => x + 1, 0);
    const toastTimer = useRef<number | undefined>(undefined);

    const current = routes[routes.length - 1];
    const currentPlace = session.currentPlace;
    const npcsAtCurrent = session.npcsAt(session.currentPlaceId);

    const showToast = (message: string, durationMs: number = TOAST_MS.default) => {
        setToast(message);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), durationMs);
    };

    const navigate = (route: Route) => setRoutes((rs) => [...rs, route]);
    const back = () => setRoutes((rs) => (rs.length > 1 ? rs.slice(0, -1) : rs));
    const openPlace = () => setRoutes([{ name: 'place' }]);

    const save = () => {
        try {
            window.localStorage.setItem(SAVE_KEY, JSON.stringify(session.exportSave()));
            showToast('Game saved.');
        } catch {
            showToast('Could not save.');
        }
    };

    const load = () => {
        try {
            const saved = loadSave();
            if (!saved) {
                showToast('No save found.');
                return;
            }
            sessionRef.current = WorldSession.fromSave(saved);
            setRoutes([{ name: 'place' }]);
            bump();
            showToast('Game loaded.');
        } catch {
            showToast('Save could not be loaded.');
        }
    };

    const rest = () => {
        session.rest();
        bump();
        showToast('Your party is fully rested.');
    };

    const buy = (shopId: string | undefined, entry: ShopEntry) => {
        const result = session.buy(shopId ?? '', entry);
        bump();
        if (result === 'ok') showToast(`Purchased ${entry.item.name}.`);
        else if (result === 'sold_out') showToast('That item is sold out.');
        else if (result === 'inventory_full') showToast('Inventory is full.');
        else showToast('Not enough gold.');
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

    const setPosition = (characterId: string, position: TeamPosition) => {
        const character = session.team.getCharacter(characterId);
        const ok = session.setPosition(characterId, position);
        bump();
        showToast(ok && character ? `${character.name} moved to the ${position} row.` : 'Could not change position.');
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
            openPlace,
            showToast,
            save,
            rest,
            buy,
            sell,
            equipTo,
            useOn,
            setPosition,
            findNpc: session.findNpc.bind(session),
            refresh: bump,
            load,
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
