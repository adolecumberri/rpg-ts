import { Character, IntervalCombat, Stats } from '../../../src';
import type { IntervalCombatOptions, IntervalCombatResult } from '../../../src';
import type { IntervalBattleEntry } from './intervalBattle';

// TEMPORARY QA config: dummy battles of growing size to preview the
// adaptive battle grid before any real multi-fighter encounter exists.
// Delete this file once real big teams arrive.

export type StressBattleSize = 'small' | 'big' | 'huge' | 'giant';

type StressEntry = {
    id: string;
    name: string;
    interval: number;
    icon: string;
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
};

const SMALL_ALLIES: StressEntry[] = [
    { id: 'stress-hero', name: 'Hero', interval: 3, icon: '🦸', hp: 36, totalHp: 36, attack: 12, defence: 4 },
    { id: 'stress-companion', name: 'Companion', interval: 4, icon: '🏹', hp: 32, totalHp: 32, attack: 10, defence: 3 },
    { id: 'stress-ember', name: 'Ember', interval: 5, icon: '🐉', hp: 30, totalHp: 30, attack: 11, defence: 2 },
    { id: 'stress-bard', name: 'Bard', interval: 4, icon: '🎵', hp: 30, totalHp: 30, attack: 9, defence: 5 },
    { id: 'stress-knight', name: 'Knight', interval: 5, icon: '🛡️', hp: 38, totalHp: 38, attack: 13, defence: 6 },
    { id: 'stress-monk', name: 'Monk', interval: 3, icon: '🥋', hp: 28, totalHp: 28, attack: 10, defence: 1 },
];

const SMALL_ENEMIES: StressEntry[] = [
    { id: 'stress-goblin-a', name: 'Goblin A', interval: 4, icon: '👺', hp: 24, totalHp: 24, attack: 6, defence: 0 },
    { id: 'stress-goblin-b', name: 'Goblin B', interval: 5, icon: '👺', hp: 22, totalHp: 22, attack: 5, defence: 0 },
    { id: 'stress-goblin-c', name: 'Goblin C', interval: 4, icon: '👺', hp: 26, totalHp: 26, attack: 6, defence: 1 },
    { id: 'stress-goblin-d', name: 'Goblin D', interval: 5, icon: '👺', hp: 20, totalHp: 20, attack: 7, defence: 0 },
    { id: 'stress-goblin-e', name: 'Goblin E', interval: 4, icon: '👺', hp: 28, totalHp: 28, attack: 5, defence: 1 },
    { id: 'stress-troll-a', name: 'Troll A', interval: 6, icon: '👹', hp: 45, totalHp: 45, attack: 9, defence: 2 },
    { id: 'stress-troll-b', name: 'Troll B', interval: 7, icon: '👹', hp: 48, totalHp: 48, attack: 8, defence: 2 },
    { id: 'stress-troll-c', name: 'Troll C', interval: 6, icon: '👹', hp: 42, totalHp: 42, attack: 10, defence: 1 },
    { id: 'stress-wolf-a', name: 'Wolf A', interval: 2, icon: '🐺', hp: 16, totalHp: 16, attack: 6, defence: 0 },
    { id: 'stress-wolf-b', name: 'Wolf B', interval: 2, icon: '🐺', hp: 16, totalHp: 16, attack: 6, defence: 0 },
];

type StressGroup = {
    id: string;
    name: string;
    count: number;
    interval: number;
    icon: string;
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
};

function expandGroup(group: StressGroup): StressEntry[] {
    const entries: StressEntry[] = [];
    for (let index = 1; index <= group.count; index++) {
        entries.push({
            id: `${group.id}-${index}`,
            name: `${group.name} ${index}`,
            interval: group.interval,
            icon: group.icon,
            hp: group.hp,
            totalHp: group.totalHp,
            attack: group.attack,
            defence: group.defence,
        });
    }
    return entries;
}

export const INTERVAL_STRESS_TEST: Record<
    StressBattleSize,
    { allies: StressEntry[]; enemies: StressEntry[] }
> = {
    small: { allies: SMALL_ALLIES, enemies: SMALL_ENEMIES },
    big: {
        allies: [
            ...SMALL_ALLIES,
            { id: 'stress-recruit-a', name: 'Recruit A', interval: 4, icon: '⚔️', hp: 28, totalHp: 28, attack: 8, defence: 2 },
            { id: 'stress-recruit-b', name: 'Recruit B', interval: 5, icon: '🪓', hp: 28, totalHp: 28, attack: 8, defence: 2 },
        ],
        enemies: [
            ...expandGroup({ id: 'stress-goblin', name: 'Goblin', count: 8, interval: 4, icon: '👺', hp: 24, totalHp: 24, attack: 6, defence: 0 }),
            ...expandGroup({ id: 'stress-troll', name: 'Troll', count: 4, interval: 6, icon: '👹', hp: 45, totalHp: 45, attack: 9, defence: 2 }),
            ...expandGroup({ id: 'stress-wolf', name: 'Wolf', count: 4, interval: 2, icon: '🐺', hp: 16, totalHp: 16, attack: 6, defence: 0 }),
        ],
    },
    huge: {
        allies: [
            ...SMALL_ALLIES,
            ...expandGroup({ id: 'stress-soldier', name: 'Soldier', count: 9, interval: 4, icon: '🛡️', hp: 26, totalHp: 26, attack: 9, defence: 1 }),
        ],
        enemies: [
            ...expandGroup({ id: 'stress-goblin', name: 'Goblin', count: 16, interval: 4, icon: '👺', hp: 22, totalHp: 22, attack: 5, defence: 0 }),
            ...expandGroup({ id: 'stress-troll', name: 'Troll', count: 8, interval: 6, icon: '👹', hp: 42, totalHp: 42, attack: 8, defence: 2 }),
            ...expandGroup({ id: 'stress-wolf', name: 'Wolf', count: 6, interval: 2, icon: '🐺', hp: 15, totalHp: 15, attack: 5, defence: 0 }),
        ],
    },
    giant: {
        allies: [
            ...SMALL_ALLIES,
            ...expandGroup({ id: 'stress-soldier', name: 'Soldier', count: 40, interval: 4, icon: '⚔️', hp: 26, totalHp: 26, attack: 9, defence: 1 }),
            ...expandGroup({ id: 'stress-archer', name: 'Archer', count: 20, interval: 4, icon: '🏹', hp: 22, totalHp: 22, attack: 10, defence: 0 }),
            ...expandGroup({ id: 'stress-knight', name: 'Knight', count: 14, interval: 5, icon: '🛡️', hp: 32, totalHp: 32, attack: 12, defence: 3 }),
        ],
        enemies: [
            ...expandGroup({ id: 'stress-goblin', name: 'Goblin', count: 60, interval: 4, icon: '👺', hp: 20, totalHp: 20, attack: 5, defence: 0 }),
            ...expandGroup({ id: 'stress-troll', name: 'Troll', count: 30, interval: 6, icon: '👹', hp: 40, totalHp: 40, attack: 8, defence: 2 }),
            ...expandGroup({ id: 'stress-wolf', name: 'Wolf', count: 30, interval: 2, icon: '🐺', hp: 14, totalHp: 14, attack: 5, defence: 0 }),
        ],
    },
};

function toEntry(entry: StressEntry): IntervalBattleEntry {
    return {
        character: new Character({
            id: entry.id,
            name: entry.name,
            stats: new Stats({
                attack: entry.attack,
                defence: entry.defence,
                hp: entry.hp,
                totalHp: entry.totalHp,
            }),
        }),
        interval: entry.interval,
        icon: entry.icon,
        image: '',
    };
}

export function buildIntervalStressCombatants(size: StressBattleSize = 'small'): {
    left: IntervalBattleEntry[];
    right: IntervalBattleEntry[];
} {
    const battle = INTERVAL_STRESS_TEST[size];
    return { left: battle.allies.map(toEntry), right: battle.enemies.map(toEntry) };
}

// Bigger battles may run longer before a side falls; keep them bounded.
const STRESS_MAX_TICKS: Record<StressBattleSize, number> = { small: 120, big: 150, huge: 180, giant: 250 };

export function resolveIntervalStressDemo(
    size: StressBattleSize = 'small',
    options: IntervalCombatOptions = {},
): IntervalCombatResult {
    const { left, right } = buildIntervalStressCombatants(size);
    return new IntervalCombat().resolve(left, right, { maxTicks: STRESS_MAX_TICKS[size], ...options });
}
