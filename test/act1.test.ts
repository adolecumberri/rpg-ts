import { WorldSession } from '../worldTest/core/session';
import { PLACES } from '../worldTest/core/world';
import { ACT1 } from '../worldTest/core/config/act1';
import { INVENTORY } from '../worldTest/core/config/inventory';
import { inventoryCapacity } from '../worldTest/core/inventory';
import { farmerNameFor } from '../worldTest/core/names';

describe('act 1 world', () => {
    it('starts the recruit at the order camp with sack and outfit', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.currentPlaceId).toBe('camp');
        expect(session.currentPlace.name).toBe('Order Camp');

        const player = session.team.getCharacter('player')!;
        expect(player.name).toBe('Player');
        expect(player.equipment.get('bag')?.id).toBe('sack');
        // The outfit lives in the second loadout hole.
        expect(player.loadout?.holes?.[1]?.id).toBe('farmer_outfit');

        // 5 base slots + the sack's 5 = 10.
        expect(inventoryCapacity(session.team)).toBe(INVENTORY.baseSlots + 5);
    });

    it('stores its people as data inside the place', () => {
        // The old farm content (the lord's household) was removed: the
        // farm is an empty shell until its act content returns.
        const farm = PLACES.find((place) => place.id === 'farm')!;
        expect(farm.npcs).toEqual([]);
        expect(farm.actions).toEqual([]);

        // The camp roster has a CONSTANT class composition, declared in
        // ACT1.roster: archers + healers (Arturo among them) + soldiers.
        const recruits = ACT1.roster.archers + ACT1.roster.healers + ACT1.roster.soldiers;
        const camp = PLACES.find((place) => place.id === 'camp')!;
        expect(camp.npcs).toHaveLength(recruits + 1); // the captain + the recruits
        expect(camp.npcs.find((npc) => npc.id === 'general')?.name).toBe('Captain Rodrigo');
        expect(camp.npcs.find((npc) => npc.id === 'arturo')?.inRoster).toBe(true);
        expect(camp.npcs.filter((npc) => npc.inRoster)).toHaveLength(recruits + 1);
        expect(PLACES.find((place) => place.id === 'hay_field')!.npcs).toEqual([]);
    });

    it('keeps the camp roster composition constant', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const camp = session.npcsAt('camp');

        const classOf = (id: string): string => {
            if (id.indexOf('archer_') === 0) return 'archer';
            if (id.indexOf('healer_') === 0 || id === 'arturo') return 'healer';
            if (id.indexOf('soldier_') === 0) return 'soldier';
            return 'other';
        };

        const counts: Record<string, number> = { archer: 0, healer: 0, soldier: 0, other: 0 };
        for (const npc of camp) {
            counts[classOf(npc.id)]++;
        }
        expect(counts.archer).toBe(ACT1.roster.archers);
        expect(counts.healer).toBe(ACT1.roster.healers);
        expect(counts.soldier).toBe(ACT1.roster.soldiers);
        expect(counts.other).toBe(1); // the captain
    });

    it('tracks the camp recruits and their roster', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // The farm's old household content is gone.
        expect(session.npcsAt('farm')).toEqual([]);

        // the camp holds the captain and the recruits: archers, healers
        // and soldiers (the constant ACT1.roster composition)
        const recruits = ACT1.roster.archers + ACT1.roster.healers + ACT1.roster.soldiers;
        expect(session.npcsAt('camp')).toHaveLength(recruits + 1);
        expect(session.findNpc('general')).toBeDefined();
        expect(session.findNpc('archer_3')).toBeDefined();
        expect(session.findNpc('healer_0')).toBeDefined();
        expect(session.findNpc('soldier_5')).toBeDefined();
        expect(session.findNpc('soldier_7')).toBeDefined();

        // the roster owns the player + the recruits + the captain,
        // only the player is active
        expect(session.roster.all()).toHaveLength(recruits + 2);
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

    it('performs gathering tasks and respects the inventory capacity', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // The recruit starts with an EMPTY bag: 10 slots (5 base + the
        // sack's 5).
        expect(session.team.inventory.getAllItems()).toHaveLength(0);

        expect(session.doTask({ itemId: 'wood', quantity: 1 }).ok).toBe(true);
        expect(session.doTask({ itemId: 'hay', quantity: 1 }).ok).toBe(true);
        expect(session.team.inventory.getItemSlotByItemId('wood')?.totalQuantity).toBe(1);

        // Stacking always fits: wood and hay grow inside their slots.
        expect(session.doTask({ itemId: 'wood', quantity: 1 }).ok).toBe(true);
        expect(session.doTask({ itemId: 'hay', quantity: 1 }).ok).toBe(true);
        expect(session.team.inventory.getAllItems()).toHaveLength(2);

        // Fill the remaining 8 slots with brand-new item types.
        for (let index = 0; index < 8; index++) {
            session.itemTable.register({
                id: `filler_${index}`,
                name: `Filler ${index}`,
                category: 'utility',
            });
            expect(session.doTask({ itemId: `filler_${index}`, quantity: 1 }).ok).toBe(true);
        }
        expect(session.team.inventory.getAllItems()).toHaveLength(10);

        // A brand-new item type at full capacity is refused.
        session.itemTable.register({ id: 'stone', name: 'Stone', category: 'utility' });
        expect(session.doTask({ itemId: 'stone', quantity: 1 }).ok).toBe(false);
    });

    it('registers the current missions and their places', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // The old farm-era encargos were removed: only the act-1 story
        // missions remain (the three sparring matches, the captain and
        // the caza menor).
        expect(session.missions.mission('spar_with_soldier')).toBeDefined();
        expect(session.missions.mission('spar_with_mage')).toBeDefined();
        expect(session.missions.mission('spar_with_archer')).toBeDefined();
        expect(session.missions.mission('spar_with_captain')).toBeDefined();
        expect(session.missions.mission('caza_menor')).toBeDefined();
        expect(session.missions.mission('training')).toBeUndefined();
        expect(session.missions.mission('spring_sowing')).toBeUndefined();
        expect(session.missions.mission('test_mission')).toBeUndefined();

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
        expect(ACT1.startPlaceId).toBe('camp');
    });
});
