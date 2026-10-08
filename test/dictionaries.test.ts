import { DEFAULT_ITEM_TABLE } from '../worldTest/core/items';
import { Items } from '../worldTest/core/constants/items';
import { CATEGORIES } from '../worldTest/core/constants/categories';
import { EQUIPMENT_SLOTS } from '../worldTest/core/constants/equipmentSlots';
import { LOADOUT_SLOTS } from '../worldTest/core/constants/loadoutSlots';
import { WEAPON_TYPES } from '../worldTest/core/constants/weaponTypes';
import { RANGES } from '../worldTest/core/constants/ranges';
import { FLAGS } from '../worldTest/core/constants/flags';
import { Missions } from '../worldTest/core/constants/missions';
import { PLACES } from '../worldTest/core/world';
import type { ItemTableEntry } from '../worldTest/core/loot/itemTable';
import type { Mission } from '../worldTest/core/missions/mission';

describe('the value dictionaries', () => {
    it('every item field uses its dictionary value (no raw strings)', () => {
        for (const entry of Object.values(Items) as ItemTableEntry[]) {
            if (entry.category !== undefined) {
                expect(Object.values(CATEGORIES)).toContain(entry.category);
            }
            if (entry.slot !== undefined) {
                expect(Object.values(EQUIPMENT_SLOTS)).toContain(entry.slot);
            }
            if (entry.loadoutSlot !== undefined) {
                expect(Object.values(LOADOUT_SLOTS)).toContain(entry.loadoutSlot);
            }
            if (entry.weaponType !== undefined) {
                expect(Object.values(WEAPON_TYPES)).toContain(entry.weaponType);
            }
            if (entry.rangeOf !== undefined) {
                expect(Object.values(RANGES)).toContain(entry.rangeOf);
            }
        }
    });

    it('every place lock and hidden flag uses the flags dictionary', () => {
        for (const place of PLACES) {
            if (place.lockedByFlag !== undefined) {
                expect(Object.values(FLAGS)).toContain(place.lockedByFlag);
            }
            if (place.hiddenUntilFlag !== undefined) {
                expect(Object.values(FLAGS)).toContain(place.hiddenUntilFlag);
            }
        }
    });

    it('every mission reward flag uses the flags dictionary (no magic strings)', () => {
        const values = Object.values(FLAGS);
        for (const mission of Object.values(Missions) as Mission[]) {
            for (const step of mission.steps) {
                if (step.kind !== 'reward') continue;
                for (const flag of step.flags ?? []) {
                    expect(values).toContain(flag);
                }
            }
        }
    });

    it('the flag values stay stable for old saves', () => {
        expect(FLAGS.EAST_FIELD_UNLOCKED).toBe('east_field_unlocked');
        expect(FLAGS.SOUTH_BEACH_UNLOCKED).toBe('south_beach_unlocked');
        expect(DEFAULT_ITEM_TABLE.has(Items.sword.id)).toBe(true);
    });
});
