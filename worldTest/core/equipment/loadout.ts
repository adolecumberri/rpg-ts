import type { Character, Item, Team } from '../../../src';
import { Item as ItemClass } from '../../../src';
import type { EquipmentSlot } from '../../../src/classes/items/EquipmentManager';
import { WEAPON_TYPES } from '../constants/weaponTypes';
import { LOADOUT_SLOTS } from '../constants/loadoutSlots';
import { heldJobOf } from '../constants/jobs';
import type { WeaponType } from '../jobs/Job';

// ---------------------------------------------------------------------------
// The equipment loadout. Every character has FIVE generic holes (each
// holds one item or nothing): the first hole may carry an accessory,
// the next one clothes, another a weapon... The content each hole may
// take comes from the SLOT DEFINITIONS below — the kinds an item can
// belong to, with their global limits per character — plus the
// equippability policy (character config + job, character priority).
// ---------------------------------------------------------------------------

// How many holes every character has.
export const SLOT_COUNT = 5;

// The kind an item belongs to (its definition declares loadoutSlot).
export type LoadoutSlot = 'weapon' | 'offhand' | 'helmet' | 'clothes' | 'accessory';

// The equipment tab pages (one section per page).
export type EquipmentSection =
    | 'espadas'
    | 'varas'
    | 'arcos'
    | 'cascos'
    | 'ropa'
    | 'escudos'
    | 'accesorios';

// What a bearer may equip. Every field is optional: an unset field
// inherits from the job's policy.
export type EquipmentPolicy = {
    weaponTypes?: WeaponType[];
    canShield?: boolean;
    doubleWeapon?: boolean;
};

/**
 * A slot definition: one of the KINDS a hole may be filled with —
 * its label, icon and the global maximum of that kind the character
 * may wear across all its holes. These are the options of what can be
 * selected into an empty slot, NOT the literal holes of the page.
 */
export type SlotDefinition = {
    kind: LoadoutSlot;
    label: string;
    icon: string;
    max: number;
};

export const SLOT_DEFINITIONS: SlotDefinition[] = [
    { kind: 'weapon', label: 'Arma', icon: 'espada', max: 1 },
    { kind: 'offhand', label: 'Escudo', icon: 'escudo', max: 1 },
    { kind: 'helmet', label: 'Casco', icon: 'casco', max: 1 },
    { kind: 'clothes', label: 'Ropa', icon: 'armadura', max: 1 },
    { kind: 'accessory', label: 'Accesorio', icon: 'default', max: 2 },
];

const SLOTS_BY_KIND: Record<LoadoutSlot, SlotDefinition> = SLOT_DEFINITIONS.reduce(
    (acc: Record<LoadoutSlot, SlotDefinition>, definition) => {
        acc[definition.kind] = definition;
        return acc;
    },
    {} as Record<LoadoutSlot, SlotDefinition>,
);

/** The definition of a kind (what a hole may hold). */
export function slotDefinitionOf(kind: LoadoutSlot): SlotDefinition {
    return SLOTS_BY_KIND[kind];
}

/** A character's loadout: its five holes, each with one item or none. */
export type CharacterLoadout = {
    holes: Array<Item | undefined>;
};

declare module '@rpg' {
    interface ItemDefinition {
        // Which kind the item belongs to (its definition declares it).
        loadoutSlot?: LoadoutSlot;
        // How many arms a weapon occupies: 1 = one-handed, 2 = two-handed.
        arms?: 1 | 2;
        // The icon dictionary id the item renders with (web assets/icons).
        icon?: string;
    }

    interface Character {
        // The five-hole loadout (undefined until the character equips).
        loadout?: CharacterLoadout;
        // The character's own equippability policy (abilities set it);
        // unset fields inherit from the held job.
        equipmentPolicy?: EquipmentPolicy;
    }
}

export function emptyLoadout(): CharacterLoadout {
    return { holes: [undefined, undefined, undefined, undefined, undefined] };
}

/** The character's loadout, created lazily on first use. */
export function loadoutOf(character: Character): CharacterLoadout {
    if (!character.loadout) {
        character.loadout = emptyLoadout();
    }
    return character.loadout;
}

/** The index of the first empty hole (the last one when all are full). */
export function firstFreeHole(character: Character): number {
    const holes = loadoutOf(character).holes;
    const index = holes.findIndex((entry) => entry === undefined);
    return index === -1 ? SLOT_COUNT - 1 : index;
}

/** The effective policy: the character's own fields win over the job's. */
export function policyOf(character: Character): EquipmentPolicy {
    const job = heldJobOf(character);
    const own = character.equipmentPolicy ?? {};
    return {
        weaponTypes: own.weaponTypes ?? job?.weaponTypes,
        canShield: own.canShield ?? job?.canShield ?? false,
        doubleWeapon: own.doubleWeapon ?? false,
    };
}

/**
 * Every equipped item the character carries, legacy manager plus the
 * loadout holes (deduplicated by id). Combat reads equipment via this.
 */
export function equippedItemsOf(character: Character): Item[] {
    const items = character.equipment.getEquippedItems();
    const loadout = character.loadout;
    if (!loadout) return items;
    const seen = new Set(items.map((item) => item.id));
    for (const item of loadout.holes) {
        if (item && !seen.has(item.id)) {
            items.push(item);
            seen.add(item.id);
        }
    }
    return items;
}

/** The tab section an item belongs to, if any. */
export function sectionOfItem(item: Item): EquipmentSection | undefined {
    const type = item.definition.weaponType;
    if (type === WEAPON_TYPES.sword) return 'espadas';
    if (type === WEAPON_TYPES.bow) return 'arcos';
    if (type === WEAPON_TYPES.staff) return 'varas';
    const slot = item.definition.loadoutSlot;
    if (slot === LOADOUT_SLOTS.offhand) return 'escudos';
    if (slot === LOADOUT_SLOTS.helmet) return 'cascos';
    if (slot === LOADOUT_SLOTS.clothes) return 'ropa';
    if (slot === LOADOUT_SLOTS.accessory) return 'accesorios';
    return undefined;
}

/**
 * The outcome of an equipment operation, machine-readable: the UI
 * translates these codes into its own wording (tests/logs may use the
 * `message` field instead).
 */
export type EquipOutcome =
    | 'ok'
    | 'not-equippable'
    | 'job-refused'
    | 'capacity-full'
    | 'two-hands'
    | 'no-copies'
    | 'unknown-slot'
    | 'empty-slot';

export type EquipResult = {
    ok: boolean;
    code: EquipOutcome;
    message: string;
    // Items the new equipment replaced (return them to the bag).
    replaced: Item[];
};

export type UnequipResult = {
    ok: boolean;
    code: EquipOutcome;
    message: string;
    // Items that left the loadout (return them to the bag).
    removed: Item[];
};

/** Whether the character may wear the item at all (policy checks). */
export function canEquipItem(character: Character, item: Item): EquipResult {
    const kind = item.definition.loadoutSlot;
    if (!kind) {
        return {
            ok: false,
            code: 'not-equippable',
            message: 'This item cannot be equipped.',
            replaced: [],
        };
    }
    const policy = policyOf(character);
    if (kind === 'weapon') {
        const type = item.definition.weaponType;
        if (type && policy.weaponTypes && policy.weaponTypes.indexOf(type) === -1) {
            return {
                ok: false,
                code: 'job-refused',
                message: 'Your job does not allow you to equip this.',
                replaced: [],
            };
        }
    }
    if (kind === 'offhand') {
        if (!policy.canShield) {
            return {
                ok: false,
                code: 'job-refused',
                message: 'Your job does not allow you to equip this.',
                replaced: [],
            };
        }
    }
    return { ok: true, code: 'ok', message: '', replaced: [] };
}

/**
 * Equips the item into the given hole, applying its stat effects.
 * The hole is generic (anything goes in any hole); the slot
 * definitions limit the totals per kind: one weapon, one shield, one
 * helmet, one clothes, two accessories. A two-handed weapon drops any
 * shield; a shield stands alone or beside a one-handed weapon.
 */
export function equipInto(character: Character, holeIndex: number, item: Item): EquipResult {
    if (holeIndex < 0 || holeIndex >= SLOT_COUNT) {
        return { ok: false, code: 'unknown-slot', message: 'Unknown slot.', replaced: [] };
    }
    const kind = item.definition.loadoutSlot;
    if (!kind) {
        return {
            ok: false,
            code: 'not-equippable',
            message: 'This item cannot be equipped.',
            replaced: [],
        };
    }
    const allowed = canEquipItem(character, item);
    if (!allowed.ok) return allowed;

    const definition = slotDefinitionOf(kind);
    const holes = loadoutOf(character).holes;
    const current = holes[holeIndex];
    const replaced: Item[] = [];

    // How many of this kind are worn in the OTHER holes.
    let worn = 0;
    for (let index = 0; index < holes.length; index++) {
        if (index !== holeIndex && holes[index]?.definition.loadoutSlot === kind) {
            worn += 1;
        }
    }

    // Single-max kinds REPLACE what is already worn (a new sword swaps
    // the old one, which returns to the bag); the accessory kind fills
    // up to its capacity and then refuses. For weapons, the double-
    // weapon ability may allow a second one-handed weapon instead.
    if (worn >= definition.max) {
        if (definition.max > 1) {
            return {
                ok: false,
                code: 'capacity-full',
                message: `${definition.label} is full.`,
                replaced,
            };
        }
        let allowSecond = false;
        if (kind === 'weapon') {
            const policy = policyOf(character);
            const other = holes.find((entry) => entry?.definition.loadoutSlot === 'weapon');
            const bothOneHanded = Boolean(other)
                && (other?.definition.arms ?? 1) === 1
                && (item.definition.arms ?? 1) === 1;
            allowSecond = Boolean(policy.doubleWeapon) && bothOneHanded;
        }
        if (!allowSecond) {
            const existing = holes.findIndex((entry, index) =>
                index !== holeIndex && entry?.definition.loadoutSlot === kind);
            if (existing !== -1) {
                const old = holes[existing] as Item;
                old.unEquip(character);
                holes[existing] = undefined;
                replaced.push(old);
            }
        }
    }

    if (kind === 'offhand') {
        // The shield stands alone or beside a one-handed weapon; only
        // a two-handed weapon occupies both hands and blocks it.
        const weapon = holes.find((entry) => entry?.definition.loadoutSlot === 'weapon');
        if (weapon && (weapon.definition.arms ?? 1) === 2) {
            return {
                ok: false,
                code: 'two-hands',
                message: 'The weapon occupies both hands.',
                replaced,
            };
        }
    }

    if (kind === 'weapon' && (item.definition.arms ?? 1) === 2) {
        // A two-handed weapon occupies both arms: drop any shield.
        for (let index = 0; index < holes.length; index++) {
            const entry = holes[index];
            if (entry && entry.definition.loadoutSlot === 'offhand') {
                entry.unEquip(character);
                holes[index] = undefined;
                replaced.push(entry);
            }
        }
    }

    if (current) {
        current.unEquip(character);
        replaced.push(current);
    }
    holes[holeIndex] = item;
    item.equip(character);
    return { ok: true, code: 'ok', message: `${item.name} equipped.`, replaced };
}

/** Unequips one hole, returning its item. */
export function unequipHole(character: Character, holeIndex: number): UnequipResult {
    const holes = loadoutOf(character).holes;
    const item = holes[holeIndex];
    if (!item) {
        return {
            ok: false,
            code: 'empty-slot',
            message: 'Nothing equipped in this slot.',
            removed: [],
        };
    }
    item.unEquip(character);
    holes[holeIndex] = undefined;
    return { ok: true, code: 'ok', message: `${item.name} unequipped.`, removed: [item] };
}

/**
 * Equips one available copy from the shared bag into a hole,
 * returning replaced items to the bag and consuming the copy.
 */
export function equipFromInventory(
    team: Team,
    character: Character,
    itemId: string,
    holeIndex: number,
): EquipResult {
    const inventory = team.inventory;
    const slot = inventory.getItemSlotByItemId(itemId);
    if (!slot || slot.quantity <= 0) {
        return {
            ok: false,
            code: 'no-copies',
            message: 'No available copies in the bag.',
            replaced: [],
        };
    }
    const result = equipInto(character, holeIndex, new ItemClass(slot.item.definition));
    if (!result.ok) return result;
    for (const old of result.replaced) {
        inventory.returnAvailable(old.id, 1);
    }
    inventory.consumeAvailable(itemId, 1);
    return result;
}

/** Unequips a hole, returning its item to the bag. */
export function unequipToInventory(team: Team, character: Character, holeIndex: number): UnequipResult {
    const result = unequipHole(character, holeIndex);
    if (!result.ok) return result;
    for (const item of result.removed) {
        team.inventory.returnAvailable(item.id, 1);
    }
    return result;
}

/**
 * Moves loadout-compatible legacy equipment into the five-hole
 * loadout and drops it from the legacy manager. Items the loadout
 * cannot hold (the bag, untyped weapons) stay in the legacy manager,
 * where combat still counts them. Used to self-heal saves and worlds
 * made before the loadout existed, so the new UI shows the gear the
 * character always carried.
 */
export function migrateLegacyEquipment(character: Character): void {
    const slots = character.equipment.getAllSlots();
    for (const slot of Object.keys(slots) as EquipmentSlot[]) {
        const item = slots[slot];
        if (!item || !item.definition.loadoutSlot) continue;
        // The legacy manager and the loadout share one modifier source
        // per item id: unEquip first so the loadout equip re-adds it,
        // instead of a later legacy unequip wiping the loadout's stat
        // bonus. A refused item goes back to the legacy manager.
        character.equipment.unequip(slot, character);
        const result = equipInto(character, firstFreeHole(character), item);
        if (!result.ok) {
            character.equipment.equipOrReplace(item, character);
        }
    }
}
