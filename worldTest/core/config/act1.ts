import { Character, Stats } from '../../../src';
import { Hunt } from '../events/hunt';
import type { Mission } from '../missions';
import type { ArrivalEvent } from '../types';
import { FLAGS } from './flags';

// Fixed values of Act 1: El Fergel, the lord's farm, and the runaway
// cow. Lore only for now — the systems are ready, this is the content.

export const ACT1 = {
    startPlaceId: 'farm',
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
    // archers, 2 healers (Arturo among them) and 6 soldiers.
    recruits: {
        archer: { hp: 12, totalHp: 12, attack: 5, defence: 0, speed: 8 },
        healer: { hp: 12, totalHp: 12, attack: 2, defence: 0, speed: 6 },
        soldier: { hp: 20, totalHp: 20, attack: 6, defence: 3, speed: 5 },
    },
    tasks: [
        { id: 'chop_wood', label: 'Chop wood', icon: '', itemId: 'wood', quantity: 1 },
        { id: 'collect_hay', label: 'Collect hay', icon: '', itemId: 'hay', quantity: 1 },
    ],
} as const;

/**
 * The bought farmer the player starts as: no combat skills, a sack on
 * the back and a basic outfit.
 */
export function buildPlayerFarmer(): Character {
    return new Character({
        id: ACT1.player.id,
        name: ACT1.player.name,
        stats: new Stats(ACT1.player.stats),
    });
}

/**
 * Board mission 1: carry sickles to the hay field. The road stays
 * closed (not shown on the map) until the mission is accepted. The
 * lord's son, Arturo and four more farmers travel with the mission:
 * arriving at the hay field plays their thanks, then goblins attack.
 * The story plays in three waves: a first skirmish (2 farmers), the
 * united farmers against a bigger horde (5 farmers vs 9 goblins), and
 * the goblin chief, fought by the player as the lord's son. Winning
 * the boss battle completes the mission.
 */
export function sicklesMission(): Mission {
    return {
        id: 'sickles_to_hay',
        title: 'Sickles to the Hay Field',
        description: 'Lord Alvaro needs the sickles delivered to the hay field, where Arturo is waiting. Take the road east of the farm.',
        // Parked during the story shift to the Order camp: still
        // registered (tests and direct starts work), never offered.
        hidden: true,
        // Offered on the farm's board only, with no requirements.
        availableAt: [ACT1.startPlaceId],
        requirements: { items: [{ itemId: 'sickle', quantity: 1 }] },
        npcMoves: [
            { npcId: 'lord_son', fromPlaceId: ACT1.startPlaceId, toPlaceId: 'hay_field' },
            // Arturo lives in the Order camp now: he travels from there
            // and returns there.
            { npcId: 'arturo', fromPlaceId: 'camp', toPlaceId: 'hay_field' },
        ],
        steps: [
            { id: 'go_hay', kind: 'travel', placeId: 'hay_field' },
            {
                id: 'fight_one',
                kind: 'wait_battle',
                completeOn: ['won'],
                battle: { fightId: 'hay_goblins', placeId: 'hay_field' },
            },
            {
                id: 'rally',
                kind: 'dialogue',
                lines: [
                    { speaker: 'Arturo', text: 'More of them are coming from the field!' },
                    { speaker: 'Arturo', text: 'UNITE! Everyone, form a line!' },
                ],
                battle: { fightId: 'hay_goblins_2', placeId: 'hay_field' },
            },
            {
                id: 'fight_two',
                kind: 'wait_battle',
                completeOn: ['won'],
                battle: { fightId: 'hay_goblins_2', placeId: 'hay_field' },
            },
            {
                id: 'boss_call',
                kind: 'dialogue',
                lines: [
                    { speaker: 'Federico', text: 'A goblin chief! Stand back, I will burn them.' },
                ],
                battle: { fightId: 'hay_boss', placeId: 'hay_field' },
            },
            {
                id: 'boss_fight',
                kind: 'wait_battle',
                completeOn: ['won'],
                battle: { fightId: 'hay_boss', placeId: 'hay_field' },
            },
            { id: 'done', kind: 'reward', flags: [FLAGS.SICKLES_DELIVERED] },
        ],
    };
}

/**
 * The story that plays when arriving at the hay field while the
 * sickles mission is active: chat 1 (the lord's son thanks the
 * carriers, a farmer spots goblins), then fight 1 (the goblins).
 */
export function hayFieldArrival(): ArrivalEvent {
    return {
        missionId: 'sickles_to_hay',
        chatId: 'hay_thanks',
        fightId: 'hay_goblins',
    };
}

/**
 * The story that plays when the squad arrives at the farm during the
 * renegade mission: the general spots the league, then the battle.
 */
export function renegadeArrival(): ArrivalEvent {
    return {
        missionId: 'renegade_league',
        chatId: 'renegades_spot',
        fightId: 'renegades_fight',
    };
}

/**
 * Board mission 2: chopping wood. Only offered after the sickles
 * mission is completed. Doing the chop wood task at the farm (marked
 * with an exclamation on the map) completes the mission.
 */
export function chopWoodMission(): Mission {
    return {
        id: 'chop_wood',
        title: 'Chopping Wood',
        description: 'The woodpile is low. Chop some wood from the forest edge.',
        requires: ['sickles_to_hay'],
        availableAt: [ACT1.startPlaceId],
        steps: [
            { id: 'chop', kind: 'task', taskId: 'chop_wood', placeId: ACT1.startPlaceId },
            { id: 'done', kind: 'reward', flags: [FLAGS.WOOD_CHOPPED] },
        ],
    };
}

/**
 * Board mission 3: the runaway cow (later act content). Offered on the
 * farm's board after chopping wood. The hunt in the forest, the Ent
 * fight the party must flee, and the "mission here" marker on the farm.
 */
export function cowMission(): Mission {
    return {
        id: 'cow_hunt',
        title: 'The Runaway Cow',
        requires: ['chop_wood'],
        availableAt: [ACT1.startPlaceId],
        steps: [
            {
                id: 'intro',
                kind: 'dialogue',
                lines: [
                    { speaker: 'Lord Alvaro', text: 'One of my cows has run away to the forest.' },
                    { speaker: 'Lord Alvaro', text: 'Take three farmers and bring her back.' },
                ],
            },
            { id: 'go_forest', kind: 'travel', placeId: 'forest' },
            {
                id: 'search',
                kind: 'hunt',
                foundEncounterId: 'cow',
                hunt: new Hunt([
                    { id: 'goblins', label: 'Goblins', chancePercent: 17, minCount: 1, maxCount: 3 },
                    { id: 'wolf', label: 'Wolf', chancePercent: 2 },
                    { id: 'cow', label: 'Cow', chancePercent: 5, growPercent: 5 },
                ], Math.random),
                lines: [{ speaker: 'Arturo', text: 'Let us search the forest.' }],
            },
            {
                id: 'ent',
                kind: 'dialogue',
                lines: [{ speaker: 'Arturo', text: 'The cow is close to an Ent!' }],
            },
            {
                id: 'ent_fight',
                kind: 'wait_battle',
                completeOn: ['fled'],
                lines: [{ speaker: 'Arturo', text: 'Run! We cannot fight that thing!' }],
            },
            {
                id: 'reward',
                kind: 'reward',
                flags: [FLAGS.COW_SAVED],
                markerPlaceId: ACT1.startPlaceId,
                lines: [{ speaker: 'Arturo', text: 'We made it back... but something is coming.' }],
            },
        ],
    };
}

/**
 * The Order Army's first mission: the renegade farmers league blames
 * the lord for taking their lands and has armed itself at the farm.
 * The general orders the player to form a six-person squad and drive
 * them off.
 */
export function renegadeLeagueMission(): Mission {
    return {
        id: 'renegade_league',
        title: 'The Renegade League',
        description: 'The general orders you to form a six-person squad and drive the renegade farmers off the lord\'s farm.',
        availableAt: ['camp'],
        steps: [
            {
                id: 'orders',
                kind: 'dialogue',
                lines: [
                    { speaker: 'General Roderick', text: 'The renegade league blames the lord for their lost lands.' },
                    { speaker: 'General Roderick', text: 'They have armed themselves at the farm. Form a squad of six and drive them off.' },
                ],
                // No battle here: the fight starts when the squad
                // arrives at the farm.
            },
            {
                id: 'farm_fight',
                kind: 'wait_battle',
                completeOn: ['won'],
                battle: { fightId: 'renegades_fight', placeId: ACT1.startPlaceId },
            },
            {
                id: 'struck_back',
                kind: 'dialogue',
                lines: [
                    { speaker: 'General Roderick', text: 'Some of them slipped away... and now they are at our gates!' },
                    { speaker: 'General Roderick', text: 'Defend the camp!' },
                ],
                battle: { fightId: 'renegades_fight_2', placeId: 'camp' },
            },
            {
                id: 'camp_fight',
                kind: 'wait_battle',
                completeOn: ['won'],
                battle: { fightId: 'renegades_fight_2', placeId: 'camp' },
            },
            {
                id: 'reward',
                kind: 'reward',
                flags: [FLAGS.RENEGADES_SCATTERED],
                lines: [{ speaker: 'General Roderick', text: 'Well fought. The Order thanks you.' }],
            },
        ],
    };
}

/**
 * The Order Army's second mission: the man behind the renegade league,
 * the Farmer King, holds the farm with eight men. Offered on the camp
 * board only once the renegade league mission is completed.
 */
export function farmerBossMission(): Mission {
    return {
        id: 'farmer_boss',
        title: 'The Farmer King',
        description: 'The man behind the renegade league holds the farm with eight men. Bring him down.',
        requires: ['renegade_league'],
        availableAt: ['camp'],
        steps: [
            {
                id: 'orders',
                kind: 'dialogue',
                lines: [
                    { speaker: 'General Roderick', text: 'The league had a leader: they call him the Farmer King.' },
                    { speaker: 'General Roderick', text: 'He holds the farm with eight men. End this.' },
                ],
            },
            {
                id: 'boss_fight',
                kind: 'wait_battle',
                completeOn: ['won'],
                battle: { fightId: 'farmers_boss', placeId: ACT1.startPlaceId },
            },
            {
                id: 'reward',
                kind: 'reward',
                flags: [FLAGS.FARMERS_BROKEN],
                lines: [{ speaker: 'General Roderick', text: 'The league is broken. The farm is ours.' }],
            },
        ],
    };
}
