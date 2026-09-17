// worldTest3/augmentations.ts

import { Statistics } from "../src/classes/Stats";

export interface NewStatistics extends Statistics {
    speed: number;
    mana: number;
    magicAttack: number;
    magicDefence: number;
    criticalChance: number;
    criticalMultiplier: number;
}