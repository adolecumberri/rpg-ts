import { Character, Stats } from '../../../src';
import { DropTable } from '../loot/dropTable';
import type { NPC } from '../types';

export type SpecialEncounter = {
    id: string;
    placeId: string;
    // Number of victories in the place required to trigger the spawn.
    triggerAfter: number;
    // 'once': spawns a single time. 'every': spawns again every triggerAfter victories.
    repeat: 'once' | 'every';
    name: string;
    stats: { hp: number; totalHp: number; attack: number; defence: number };
    talk: string;
    xpReward: number;
    goldReward: number;
    dropTable?: DropTable;
};

export const SPECIAL_ENCOUNTERS: SpecialEncounter[] = [];

export function buildSpecialNpc(special: SpecialEncounter): NPC {
    return {
        id: special.id,
        character: new Character({
            id: special.id,
            name: special.name,
            stats: new Stats(special.stats),
        }),
        talk: special.talk,
        xpReward: special.xpReward,
        goldReward: special.goldReward,
        dropTable: special.dropTable,
    };
}
