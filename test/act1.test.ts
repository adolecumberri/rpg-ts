import { WorldSession } from '../worldTest/core/session';
import { PLACES } from '../worldTest/core/world';
import { ACT1 } from '../worldTest/core/config/act1';
import { INVENTORY } from '../worldTest/core/config/inventory';
import { inventoryCapacity } from '../worldTest/core/inventory';
import { farmerNameFor } from '../worldTest/core/names';

describe('act 1 world', () => {
    it('starts the bought farmer on the lord farm with sack and outfit', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.currentPlaceId).toBe('farm');
        expect(session.currentPlace.name).toBe("The Lord's Farm");

        const player = session.team.getCharacter('player')!;
        expect(player.name).toBe('Player');
        expect(player.equipment.get('bag')?.id).toBe('sack');
        // The outfit lives in the second loadout hole.
        expect(player.loadout?.holes?.[1]?.id).toBe('farmer_outfit');

        // 5 base slots + the sack's 5 = 10.
        expect(inventoryCapacity(session.team)).toBe(INVENTORY.baseSlots + 5);
    });

    it('stores its people as data inside the place', () => {
        const farm = PLACES.find((place) => place.id === 'farm')!;
        expect(farm.npcs).toHaveLength(10); // the household + 4 renegades
        expect(farm.npcs.find((npc) => npc.id === 'lord')?.name).toBe('Lord Alvaro');
        expect(farm.npcs.filter((npc) => npc.group === 'The Renegade League')).toHaveLength(4);

        // The twelve farmers were recruited by the Order: they live in
        // the camp as 4 archers, 2 healers and 6 soldiers.
        const camp = PLACES.find((place) => place.id === 'camp')!;
        expect(camp.npcs).toHaveLength(13); // the general + 12 recruits
        expect(camp.npcs.find((npc) => npc.id === 'general')?.name).toBe('General Roderick');
        expect(camp.npcs.find((npc) => npc.id === 'arturo')?.inRoster).toBe(true);
        expect(camp.npcs.filter((npc) => npc.inRoster)).toHaveLength(12);
        expect(PLACES.find((place) => place.id === 'hay_field')!.npcs).toEqual([]);
    });

    it('tracks the household and the twelve Order recruits', () => {
        const session = new WorldSession({ random: () => 0.5 });

        const farmNpcs = session.npcsAt('farm');
        expect(farmNpcs).toHaveLength(10); // the household + 4 renegades

        expect(session.findNpc('lord')).toBeDefined();
        expect(session.findNpc('lord_son')).toBeDefined();
        for (let index = 1; index <= 4; index++) {
            expect(session.findNpc(`familiar_${index}`)).toBeDefined();
        }

        // the camp holds the general and the recruits: archers, healers
        // and soldiers
        expect(session.npcsAt('camp')).toHaveLength(13);
        expect(session.findNpc('general')).toBeDefined();
        expect(session.findNpc('archer_3')).toBeDefined();
        expect(session.findNpc('healer_0')).toBeDefined();
        expect(session.findNpc('soldier_5')).toBeDefined();

        // the roster owns the player + the 12 recruits, only the player is active
        expect(session.roster.all()).toHaveLength(13);
        expect(session.roster.activeIds()).toEqual(['player']);
        expect(session.roster.has('arturo')).toBe(true);
    });

    it('gives the recruits stable names seeded from their ids', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const names = new Set(session.roster.all().map((character) => character.name));

        expect(names.size).toBe(session.roster.all().length); // all unique
        const archer = session.roster.character('archer_0')!;
        expect(archer.name).toBe(farmerNameFor('archer_0', 'male'));
        expect(archer.name).not.toBe(archer.id);
    });

    it('offers the farm tasks and respects the inventory capacity', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.doTask({ itemId: 'wood', quantity: 1 }).ok).toBe(true);
        expect(session.doTask({ itemId: 'hay', quantity: 1 }).ok).toBe(true);
        expect(session.team.inventory.getItemSlotByItemId('wood')?.totalQuantity).toBe(1);

        // 10 slots: the seeded test bag takes 7 (sword, bow, staff,
        // outfit, helmet, necklace, shield) plus wood and hay — one free
        // slot left; a second new item type is refused.
        session.itemTable.register({ id: 'filler_0', name: 'Filler 0', category: 'utility' });
        expect(session.doTask({ itemId: 'filler_0', quantity: 1 }).ok).toBe(true);

        const full = session.doTask({ itemId: 'wood', quantity: 1 });
        expect(full.ok).toBe(true); // wood stacks into its existing slot

        expect(session.team.inventory.getAllItems()).toHaveLength(10);
        expect(session.doTask({ itemId: 'hay', quantity: 1 }).ok).toBe(true); // hay stacks too

        const overflow = session.doTask({ itemId: 'wood', quantity: 1 });
        expect(overflow.ok).toBe(true); // stacking always fits

        // a brand-new item type at full capacity is refused
        session.itemTable.register({ id: 'stone', name: 'Stone', category: 'utility' });
        expect(session.doTask({ itemId: 'stone', quantity: 1 }).ok).toBe(false);
    });

    it('registers the hall missions and their places', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.missions.mission('sickles_to_hay')).toBeDefined();
        expect(session.missions.mission('chop_wood')).toBeDefined();
        expect(session.missions.mission('cow_hunt')).toBeDefined();

        const placeIds = PLACES.map((place) => place.id);
        expect(placeIds).toEqual([
            'camp',
            'farm',
            'hay_field',
            'fergel_north_settlement',
            'playa_sur',
            'east_field',
            'fergel_faro',
        ]);
        expect(ACT1.startPlaceId).toBe('farm');
    });
});
