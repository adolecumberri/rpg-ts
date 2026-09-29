import type { Character, Item, Team } from '../../../src';
import { Item as ItemClass } from '../../../src';
import { heldJobOf } from '../constants/jobs';
import type { WeaponType } from '../jobs/Job';

// ---------------------------------------------------------------------------
// The equipment loadout: a character's five slots (weapon, offhand,
// helmet, clothes, accessories) with capacity rules and equippability
// policies. The data lives on each character (independent per
// character); the jobs and the characters both own a policy object and
// the effective one merges both with the CHARACTER taking priority, so
// abilities can later change what a specific character may wear.
// ---------------------------------------------------------------------------

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
    // Weapon types the bearer may wield.
    weaponTypes?: WeaponType[];
    // May hold a shield in the offhand.
    canShield?: boolean;
    // May hold a second one-handed weapon (a future ability).
    doubleWeapon?: boolean;
};

// A character's equipped items, one per slot (two accessories).
export type CharacterLoadout = {
    weapon?: Item;
    offhand?: Item;
    helmet?: Item;
    clothes?: Item;
    accessories: Item[];
};

const ACCESSORY_CAPACITY = 2;

declare module '@rpg' {
    interface ItemDefinition {
        // Which loadout slot the item occupies (content declares it).
        loadoutSlot?: LoadoutSlot;
        // How many arms a weapon occupies: 1 = one-handed, 2 = two-handed.
        arms?: 1 | 2;
    }

    interface Character {
        // The five-slot loadout (undefined until the character equips).
        loadout?: CharacterLoadout;
        // The character's own equippability policy (abilities set it);
        // unset fields inherit from the held job.
        equipmentPolicy?: EquipmentPolicy;
    }
}

export function emptyLoadout(): CharacterLoadout {
    return { accessories: [] };
}

/** The character's loadout, created lazily on first use. */
export function loadoutOf(character: Character): CharacterLoadout {
    if (!character.loadout) {
        character.loadout = emptyLoadout();
    }
    return character.loadout;
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
 * loadout (deduplicated by id). Combat reads equipment through this.
 */
export function equippedItemsOf(character: Character): Item[] {
    const items = character.equipment.getEquippedItems();
    const loadout = character.loadout;
    if (!loadout) return items;
    const seen = new Set(items.map((item) => item.id));
    const candidates = [
        loadout.weapon,
        loadout.offhand,
        loadout.helmet,
        loadout.clothes,
        ...loadout.accessories,
    ];
    for (const item of candidates) {
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
    if (type === 'sword') return 'espadas';
    if (type === 'bow') return 'arcos';
    if (type === 'staff') return 'varas';
    const slot = item.definition.loadoutSlot;
    if (slot === 'offhand') return 'escudos';
    if (slot === 'helmet') return 'cascos';
    if (slot === 'clothes') return 'ropa';
    if (slot === 'accessory') return 'accesorios';
    return undefined;
}

/** The sections a slot's picker shows (one section per page). */
export function sectionsForSlot(slot: LoadoutSlot): EquipmentSection[] {
    if (slot === 'weapon') return ['espadas', 'varas', 'arcos'];
    if (slot === 'offhand') return ['escudos'];
    if (slot === 'helmet') return ['cascos'];
    if (slot === 'clothes') return ['ropa'];
    return ['accesorios'];
}

export type EquipResult = {
    ok: boolean;
    message: string;
    // Items the new equipment replaced (return them to the bag).
    replaced: Item[];
};

export type UnequipResult = {
    ok: boolean;
    message: string;
    // Items that left the loadout (return them to the bag).
    removed: Item[];
};

/** Whether the character may wear the item at all (policy checks). */
export function canEquipItem(character: Character, item: Item): EquipResult {
    const slot = item.definition.loadoutSlot;
    if (!slot) {
        return { ok: false, message: 'This item cannot be equipped.', replaced: [] };
    }
    const policy = policyOf(character);
    if (slot === 'weapon') {
        const type = item.definition.weaponType;
        if (type && policy.weaponTypes && policy.weaponTypes.indexOf(type) === -1) {
            return { ok: false, message: 'The job cannot wield this weapon.', replaced: [] };
        }
    }
    if (slot === 'offhand') {
        if (!policy.canShield) {
            return { ok: false, message: 'The job cannot use shields.', replaced: [] };
        }
    }
    return { ok: true, message: '', replaced: [] };
}

/**
 * Equips the item into its loadout slot, applying its stat effects.
 * Capacity rules: one weapon (a two-handed one also empties the
 * offhand), one offhand (needs a one-handed weapon), one helmet, one
 * clothes, two accessories.
 */
export function equipItem(character: Character, item: Item): EquipResult {
    const slot = item.definition.loadoutSlot;
    if (!slot) {
        return { ok: false, message: 'This item cannot be equipped.', replaced: [] };
    }
    const allowed = canEquipItem(character, item);
    if (!allowed.ok) return allowed;

    const loadout = loadoutOf(character);
    const replaced: Item[] = [];

    if (slot === 'weapon') {
        const old = loadout.weapon;
        if (old) {
            old.unEquip(character);
            replaced.push(old);
        }
        loadout.weapon = item;
        // A two-handed weapon occupies the offhand slot too.
        if ((item.definition.arms ?? 1) === 2 && loadout.offhand) {
            loadout.offhand.unEquip(character);
            replaced.push(loadout.offhand);
            loadout.offhand = undefined;
        }
        item.equip(character);
        return { ok: true, message: `${item.name} equipped.`, replaced };
    }

    if (slot === 'offhand') {
        if (!loadout.weapon) {
            return { ok: false, message: 'Equip a one-handed weapon first.', replaced };
        }
        if ((loadout.weapon.definition.arms ?? 1) === 2) {
            return { ok: false, message: 'The weapon occupies both hands.', replaced };
        }
        const old = loadout.offhand;
        if (old) {
            old.unEquip(character);
            replaced.push(old);
        }
        loadout.offhand = item;
        item.equip(character);
        return { ok: true, message: `${item.name} equipped.`, replaced };
    }

    if (slot === 'helmet') {
        const old = loadout.helmet;
        if (old) {
            old.unEquip(character);
            replaced.push(old);
        }
        loadout.helmet = item;
        item.equip(character);
        return { ok: true, message: `${item.name} equipped.`, replaced };
    }

    if (slot === 'clothes') {
        const old = loadout.clothes;
        if (old) {
            old.unEquip(character);
            replaced.push(old);
        }
        loadout.clothes = item;
        item.equip(character);
        return { ok: true, message: `${item.name} equipped.`, replaced };
    }

    // Accessory: fills a free slot (two max).
    if (loadout.accessories.length >= ACCESSORY_CAPACITY) {
        return { ok: false, message: 'Both accessory slots are full.', replaced };
    }
    loadout.accessories.push(item);
    item.equip(character);
    return { ok: true, message: `${item.name} equipped.`, replaced };
}

/**
 * Unequips the given slot (accessories by index, defaulting to the
 * last one). Removing a weapon also removes the offhand, which cannot
 * exist without a one-handed weapon.
 */
export function unequipFrom(character: Character, slot: LoadoutSlot, accessoryIndex?: number): UnequipResult {
    const loadout = loadoutOf(character);
    const removed: Item[] = [];

    if (slot === 'weapon') {
        const item = loadout.weapon;
        if (!item) return { ok: false, message: 'No weapon equipped.', removed };
        item.unEquip(character);
        loadout.weapon = undefined;
        removed.push(item);
        if (loadout.offhand) {
            loadout.offhand.unEquip(character);
            removed.push(loadout.offhand);
            loadout.offhand = undefined;
        }
        return { ok: true, message: `${item.name} unequipped.`, removed };
    }

    if (slot === 'offhand') {
        const item = loadout.offhand;
        if (!item) return { ok: false, message: 'Nothing equipped there.', removed };
        item.unEquip(character);
        loadout.offhand = undefined;
        removed.push(item);
        return { ok: true, message: `${item.name} unequipped.`, removed };
    }

    if (slot === 'helmet') {
        const item = loadout.helmet;
        if (!item) return { ok: false, message: 'Nothing equipped there.', removed };
        item.unEquip(character);
        loadout.helmet = undefined;
        removed.push(item);
        return { ok: true, message: `${item.name} unequipped.`, removed };
    }

    if (slot === 'clothes') {
        const item = loadout.clothes;
        if (!item) return { ok: false, message: 'Nothing equipped there.', removed };
        item.unEquip(character);
        loadout.clothes = undefined;
        removed.push(item);
        return { ok: true, message: `${item.name} unequipped.`, removed };
    }

    const index = accessoryIndex ?? loadout.accessories.length - 1;
    const [item] = loadout.accessories.splice(index, 1);
    if (!item) return { ok: false, message: 'No accessory equipped there.', removed };
    item.unEquip(character);
    removed.push(item);
    return { ok: true, message: `${item.name} unequipped.`, removed };
}

/**
 * Equips one available copy from the shared bag, returning replaced
 * items to it and consuming the equipped copy.
 */
export function equipFromInventory(team: Team, character: Character, itemId: string): EquipResult {
    const inventory = team.inventory;
    const slot = inventory.getItemSlotByItemId(itemId);
    if (!slot || slot.quantity <= 0) {
        return { ok: false, message: 'No available copies in the bag.', replaced: [] };
    }
    const result = equipItem(character, new ItemClass(slot.item.definition));
    if (!result.ok) return result;
    for (const old of result.replaced) {
        inventory.returnAvailable(old.id, 1);
    }
    inventory.consumeAvailable(itemId, 1);
    return result;
}

/** Unequips a loadout slot, returning the removed items to the bag. */
export function unequipToInventory(
    team: Team,
    character: Character,
    loadoutSlot: LoadoutSlot,
    accessoryIndex?: number,
): UnequipResult {
    const result = unequipFrom(character, loadoutSlot, accessoryIndex);
    if (!result.ok) return result;
    for (const item of result.removed) {
        team.inventory.returnAvailable(item.id, 1);
    }
    return result;
}
