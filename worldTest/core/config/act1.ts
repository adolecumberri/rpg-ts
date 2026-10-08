import { Character, Stats } from '../../../src';
import { ARCHER_JOB, HEALER_JOB, SOLDIER_JOB } from '../constants/jobs';

// Fixed values of Act 1: El Fergel, the lord's farm and the Order
// camp. The player starts at the camp (recruited there with the other
// farmers); the farm is the lord's domain the story leads to.

export const ACT1 = {
    startPlaceId: 'camp',
    player: {
        id: 'player',
        name: 'Player',
        stats: { hp: 25, totalHp: 25, attack: 4, defence: 1, speed: 6 },
    },
    // The lord, his son and his 4 familiars.
    household: [
        { id: 'lord', name: 'Lord Alvaro', talk: '"Work hard and the farm prospers."' },
        { id: 'lord_son', name: 'Federico', talk: '"One day I will lead the hunt."' },
        { id: 'familiar_1', name: 'Lucia', talk: '"The crops look strong this season."' },
        { id: 'familiar_2', name: 'Martin', talk: '"Mind the fences."' },
        { id: 'familiar_3', name: 'Rosa', talk: '"The sea wind is good for the hay."' },
        { id: 'familiar_4', name: 'Tomas', talk: '"The forest is dangerous at night."' },
    ],
    farmers: {
        arturoId: 'arturo',
        arturoName: 'Arturo',
        // Random farmers besides Arturo and the player.
        count: 11,
        talk: '"The hay won\'t carry itself."',
        stats: { hp: 14, totalHp: 14, attack: 4, defence: 1, speed: 6 },
    },
    // The Order Army recruits (the twelve farmers, re-trained): 4
    // archers, 2 healers (Arturo among them) and 6 soldiers. Their
    // class stats and kits come from the job constants.
    recruits: {
        archer: ARCHER_JOB,
        healer: HEALER_JOB,
        soldier: SOLDIER_JOB,
    },
} as const;

/**
 * The bought farmer the player starts as: no combat skills, a sack on
 * the back and a basic outfit. He levels with the soldier's curve but
 * keeps his own farmer bases.
 */
export function buildPlayerFarmer(): Character {
    const player = new Character({
        id: ACT1.player.id,
        name: ACT1.player.name,
        stats: new Stats(ACT1.player.stats),
    });
    player.growthProfile = {
        base: { ...ACT1.player.stats, magicDefence: 0 },
        ratios: SOLDIER_JOB.growth?.ratios,
    };
    return player;
}