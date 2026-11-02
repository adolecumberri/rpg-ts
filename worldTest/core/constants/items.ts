import type { ItemTableEntry } from '../loot/itemTable';
import { applyStatus, bleedingStatus, phantomStrikeStatus } from '../statuses';
import { assignReactiveSkill, removeReactiveSkill } from '../skills';
import { CATEGORIES } from './categories';
import { EQUIPMENT_SLOTS } from './equipmentSlots';
import { LOADOUT_SLOTS } from './loadoutSlots';
import { WEAPON_TYPES } from './weaponTypes';
import { RANGES } from './ranges';

// ---------------------------------------------------------------------------
// The global item dictionary: EVERY item that exists in the app is
// declared here, once, with its id, stats and interactions. The runtime
// table (DEFAULT_ITEM_TABLE) registers FROM these constants, and the
// character generator receives the constant object itself
// (Items.stick), so the reference and the definition are the same
// source — there is no second list to drift.
// ---------------------------------------------------------------------------

export type ItemRef = ItemTableEntry;

// Stress-test blades: more swords in the shop so the item list scrolls.
const stressSword = (index: '1' | '2' | '3' | '4', name: string): ItemTableEntry => ({
    id: `sword_${index}`,
    name,
    category: CATEGORIES.weapon,
    slot: EQUIPMENT_SLOTS.weapon,
    loadoutSlot: LOADOUT_SLOTS.weapon,
    arms: 1,
    icon: 'espada',
    description: 'Stress-test blade. +4 attack.',
    effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 4 }],
    rangeOf: RANGES.short,
    weaponType: WEAPON_TYPES.sword,
});

const stressSwords = {
    sword_1: stressSword('1', 'Sword 1'),
    sword_2: stressSword('2', 'Sword 2'),
    sword_3: stressSword('3', 'Sword 3'),
    sword_4: stressSword('4', 'Sword 4'),
};

export const Items = {
    sack: {
        id: 'sack',
        name: 'Sack',
        category: CATEGORIES.equipment,
        slot: EQUIPMENT_SLOTS.bag,
        description: 'A sturdy farmer sack.',
        bagSlots: 5,
        buyValue: 30,
        sellValue: 15,
    },
    farmer_outfit: {
        id: 'farmer_outfit',
        name: 'Farmer Outfit',
        category: CATEGORIES.armor,
        slot: EQUIPMENT_SLOTS.armor,
        loadoutSlot: LOADOUT_SLOTS.clothes,
        icon: 'armadura',
        description: 'Simple clothes that keep the sun off.',
        effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 1 }],
        buyValue: 10,
        sellValue: 5,
    },
    wood: {
        id: 'wood',
        name: 'Wood',
        category: CATEGORIES.utility,
        description: 'Chopped from the forest edge.',
    },
    hay: {
        id: 'hay',
        name: 'Hay',
        category: CATEGORIES.utility,
        description: 'Collected from the fields.',
    },
    sickle: {
        id: 'sickle',
        name: 'Sickle',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        description: 'A curved blade for cutting hay. Hits inflict bleeding.',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 4 }],
        // Every real hit (damage > 0 after reactions) applies Bleeding to
        // the defender. Reapplying replaces the current instance, so the 3
        // turn countdown restarts instead of stacking. Astra blocks it.
        onHit: (context) => {
            applyStatus(context.defender, bleedingStatus());
        },
        skills: [
            {
                name: 'Bleeding',
                description: 'Real hits inflict Bleeding: 1 hp per turn for 3 turns.',
            },
        ],
        buyValue: 5,
        sellValue: 2,
    },
    stick: {
        id: 'stick',
        name: 'Stick',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        description: "A goblin's club. +1 attack.",
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 1 }],
    },
    sword: {
        id: 'sword',
        name: 'Sword',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'espada',
        description: "An Order soldier's blade. +4 attack. Short reach.",
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 4 }],
        rangeOf: RANGES.short,
        weaponType: WEAPON_TYPES.sword,
    },
    ...stressSwords,
    bow: {
        id: 'bow',
        name: 'Bow',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 2,
        icon: 'arco',
        description: "An archer's bow. +3 attack. Long reach: every row.",
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 3 }],
        rangeOf: RANGES.all,
        weaponType: WEAPON_TYPES.bow,
    },
    staff: {
        id: 'staff',
        name: 'Mage Staff',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'vara',
        description: "A healer's focus. +1 attack and +5 magic. Long reach.",
        effects: [
            { stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 1 },
            { stat: 'magic', typeOfModification: 'BUFF_FIXED', value: 5 },
        ],
        rangeOf: RANGES.long,
        weaponType: WEAPON_TYPES.staff,
    },
    // The roguelite reward arms (dev flow): each family scales in three
    // tiers so a run can hand out a better blade every wave.
    rogue_sword_1: {
        id: 'rogue_sword_1',
        name: "Recruit's Sword",
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'espada',
        description: 'A plain drill blade. +2 attack.',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 }],
        rangeOf: RANGES.short,
        weaponType: WEAPON_TYPES.sword,
    },
    rogue_sword_2: {
        id: 'rogue_sword_2',
        name: 'Iron Sword',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'espada',
        description: 'A heavier edge. +5 attack.',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 5 }],
        rangeOf: RANGES.short,
        weaponType: WEAPON_TYPES.sword,
    },
    rogue_sword_3: {
        id: 'rogue_sword_3',
        name: "Knight's Blade",
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'espada',
        description: 'A tower-forged longsword. +9 attack.',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 9 }],
        rangeOf: RANGES.short,
        weaponType: WEAPON_TYPES.sword,
    },
    rogue_bow_1: {
        id: 'rogue_bow_1',
        name: "Recruit's Bow",
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 2,
        icon: 'arco',
        description: 'A light training bow. +2 attack. Long reach.',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 }],
        rangeOf: RANGES.all,
        weaponType: WEAPON_TYPES.bow,
    },
    rogue_bow_2: {
        id: 'rogue_bow_2',
        name: 'Yew Bow',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 2,
        icon: 'arco',
        description: 'A seasoned yew bow. +5 attack. Long reach.',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 5 }],
        rangeOf: RANGES.all,
        weaponType: WEAPON_TYPES.bow,
    },
    rogue_bow_3: {
        id: 'rogue_bow_3',
        name: 'Longbow of the Order',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 2,
        icon: 'arco',
        description: 'The captain\'s longbow. +9 attack. Long reach.',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 9 }],
        rangeOf: RANGES.all,
        weaponType: WEAPON_TYPES.bow,
    },
    rogue_staff_1: {
        id: 'rogue_staff_1',
        name: 'Apprentice Staff',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'vara',
        description: 'A plain focus. +1 attack and +3 magic.',
        effects: [
            { stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 1 },
            { stat: 'magic', typeOfModification: 'BUFF_FIXED', value: 3 },
        ],
        rangeOf: RANGES.long,
        weaponType: WEAPON_TYPES.staff,
    },
    rogue_staff_2: {
        id: 'rogue_staff_2',
        name: 'Oak Staff',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'vara',
        description: 'A healer\'s oak focus. +2 attack and +7 magic.',
        effects: [
            { stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 },
            { stat: 'magic', typeOfModification: 'BUFF_FIXED', value: 7 },
        ],
        rangeOf: RANGES.long,
        weaponType: WEAPON_TYPES.staff,
    },
    rogue_staff_3: {
        id: 'rogue_staff_3',
        name: 'Runed Staff',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'vara',
        description: 'A staff carved with old wards. +3 attack and +12 magic.',
        effects: [
            { stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 3 },
            { stat: 'magic', typeOfModification: 'BUFF_FIXED', value: 12 },
        ],
        rangeOf: RANGES.long,
        weaponType: WEAPON_TYPES.staff,
    },
    helmet: {
        id: 'helmet',
        name: 'Helmet',
        category: CATEGORIES.armor,
        slot: EQUIPMENT_SLOTS.armor,
        loadoutSlot: LOADOUT_SLOTS.helmet,
        icon: 'casco',
        description: 'A simple iron cap. +1 defence.',
        effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 1 }],
        buyValue: 20,
        sellValue: 10,
    },
    shield: {
        id: 'shield',
        name: 'Shield',
        category: CATEGORIES.armor,
        slot: EQUIPMENT_SLOTS.armor,
        loadoutSlot: LOADOUT_SLOTS.offhand,
        icon: 'escudo',
        description: 'A wooden round shield. +3 defence. Needs a one-handed weapon.',
        effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 3 }],
        buyValue: 25,
        sellValue: 12,
    },
    spike_shield: {
        id: 'spike_shield',
        name: 'Spike Shield',
        category: CATEGORIES.armor,
        slot: EQUIPMENT_SLOTS.armor,
        loadoutSlot: LOADOUT_SLOTS.offhand,
        icon: 'escudo',
        description: 'Answers every [impact]impact hit[/impact] received with a counter-attack of ' +
            '[physical]10 + 20% of your defence[/physical].',
        effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 4 }],
        // The reactive skill travels with the item: equipping attaches
        // the spike shield reaction, unequipping removes it.
        onEquip: (_self, target) => {
            assignReactiveSkill(target, 'spike_shield');
        },
        onUnEquip: (_self, target) => {
            removeReactiveSkill(target, 'spike_shield');
        },
        skills: [
            {
                name: 'Spike Shield',
                description: 'Answers every impact hit received with a counter-attack of ' +
                    '10 + 20% of your defence as physical damage.',
            },
        ],
        buyValue: 300,
        sellValue: 150,
    },
    necklace: {
        id: 'necklace',
        name: 'Necklace',
        category: CATEGORIES.equipment,
        slot: EQUIPMENT_SLOTS.accessory,
        loadoutSlot: LOADOUT_SLOTS.accessory,
        icon: 'default',
        description: 'A lucky charm. +1 defence.',
        effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 1 }],
        buyValue: 15,
        sellValue: 7,
    },
    guinsoo_rageblade: {
        id: 'guinsoo_rageblade',
        name: 'Guinsoo Rageblade',
        category: CATEGORIES.weapon,
        slot: EQUIPMENT_SLOTS.weapon,
        loadoutSlot: LOADOUT_SLOTS.weapon,
        arms: 1,
        icon: 'espada',
        rangeOf: RANGES.short,
        weaponType: WEAPON_TYPES.sword,
        description: 'Every [impact]impact[/impact] adds [physical]6 physical[/physical] and ' +
            '[magical]6 magical[/magical] damage. Every 3rd attack applies the on-hit twice, ' +
            'and every 4th attack readies a [gold]Phantom Strike[/gold]: the next impact ' +
            'applies 2 extra impacts.',
        // The flat per-impact passive.
        impactBonus: { physical: 6, magical: 6 },
        impactProcs: [
            // Phantom Hit: every 3rd attack applies the on-hit twice.
            {
                id: 'guinsoo_phantom_hit',
                moment: 'hit',
                every: 3,
                onTrigger: (ctx) => {
                    ctx.impactHits += 1;
                },
            },
            // Phantom Strike: every 4th attack readies the one-shot
            // status that the next impact consumes for 2 extra impacts.
            {
                id: 'guinsoo_phantom_strike',
                moment: 'hit',
                every: 4,
                onTrigger: (ctx) => {
                    applyStatus(ctx.attacker, phantomStrikeStatus());
                },
            },
        ],
        skills: [
            {
                name: 'Impact',
                description: '+6 physical and +6 magical damage per impact hit.',
            },
            {
                name: 'Phantom Hit',
                description: 'Every 3rd attack applies the on-hit effects twice.',
            },
            {
                name: 'Phantom Strike',
                description: 'Every 4th attack readies a phantom: the next impact applies 2 extra impacts.',
            },
        ],
        buyValue: 1200,
        sellValue: 600,
    },
} satisfies Record<string, ItemTableEntry>;
