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

const CHIEF_DROP = new DropTable([
    { itemId: 'fire_staff', chance: 0.8, minQty: 1, maxQty: 1 },
    { itemId: 'health_potion', chance: 0.9, minQty: 1, maxQty: 3 },
]);

const CHAMPION_DROP = new DropTable([
    { itemId: 'cursed_ring', chance: 0.6, minQty: 1, maxQty: 1 },
    { itemId: 'wooden_shield', chance: 0.5, minQty: 1, maxQty: 1 },
]);

export const SPECIAL_ENCOUNTERS: SpecialEncounter[] = [
    {
        id: 'goblin_chief',
        placeId: 'forest',
        triggerAfter: 3,
        repeat: 'once',
        name: 'Goblin Chief',
        stats: { hp: 60, totalHp: 60, attack: 9, defence: 2 },
        talk: '"The tribe will remember this!"',
        xpReward: 60,
        goldReward: 30,
        dropTable: CHIEF_DROP,
    },
    {
        id: 'arena_champion',
        placeId: 'training',
        triggerAfter: 2,
        repeat: 'every',
        name: 'Arena Champion',
        stats: { hp: 80, totalHp: 80, attack: 7, defence: 3 },
        talk: '"I was told you were coming."',
        xpReward: 40,
        goldReward: 20,
        dropTable: CHAMPION_DROP,
    },
];

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
