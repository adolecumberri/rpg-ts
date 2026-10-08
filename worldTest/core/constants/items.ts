import { StatusInstance } from '../../../src/classes/StatusInstance';
import type { ItemTableEntry } from '../loot/itemTable';
import { bleedingStatus, phantomStrikeStatus } from '../statuses';
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
        // turn countdown restarts instead of stacking.
        onHit: (context) => {
            context.defender.statusManager.addStatusInstance(
                new StatusInstance({ definition: bleedingStatus() }),
            );
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
        description: "A healer's focus. +1 attack and [magical]+5 magic damage[/magical]. Long reach.",
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 1 }],
        elements: [{ element: 'arcane', attackValue: 5 }],
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
        onEquip: (self, target) => {
            assignReactiveSkill(target, 'spike_shield');
        },
        onUnEquip: (self, target) => {
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
                    ctx.attacker.statusManager.addStatusInstance(
                        new StatusInstance({ definition: phantomStrikeStatus() }),
                    );
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
