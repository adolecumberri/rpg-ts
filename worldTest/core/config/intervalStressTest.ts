import { Character, IntervalCombat, Stats } from '../../../src';
import type { IntervalCombatOptions, IntervalCombatResult } from '../../../src';
import type { IntervalBattleEntry } from './intervalBattle';
import { generalAttackResolver } from '../damage/general';
import { intervalFromSpeed } from './speed';

// TEMPORARY QA config: dummy battles of growing size to preview the
// adaptive battle grid before any real multi-fighter encounter exists.
// Delete this file once real big teams arrive.

export type StressBattleSize = 'small' | 'big' | 'huge' | 'giant';

type StressEntry = {
    id: string;
    name: string;
    speed: number;
    icon: string;
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
    magicDefence?: number;
};

const SMALL_ALLIES: StressEntry[] = [
    { id: 'stress-hero', name: 'Hero', speed: 8, icon: '🦸', hp: 36, totalHp: 36, attack: 12, defence: 4 },
    { id: 'stress-companion', name: 'Companion', speed: 6, icon: '🏹', hp: 32, totalHp: 32, attack: 10, defence: 3 },
    { id: 'stress-ember', name: 'Ember', speed: 5, icon: '🐉', hp: 30, totalHp: 30, attack: 11, defence: 2 },
    { id: 'stress-bard', name: 'Bard', speed: 6, icon: '🎵', hp: 30, totalHp: 30, attack: 9, defence: 5 },
    { id: 'stress-knight', name: 'Knight', speed: 5, icon: '🛡️', hp: 38, totalHp: 38, attack: 13, defence: 6 },
    { id: 'stress-monk', name: 'Monk', speed: 8, icon: '🥋', hp: 28, totalHp: 28, attack: 10, defence: 1 },
];

const SMALL_ENEMIES: StressEntry[] = [
    { id: 'stress-goblin-a', name: 'Goblin A', speed: 6, icon: '👺', hp: 24, totalHp: 24, attack: 6, defence: 0 },
    { id: 'stress-goblin-b', name: 'Goblin B', speed: 5, icon: '👺', hp: 22, totalHp: 22, attack: 5, defence: 0 },
    { id: 'stress-goblin-c', name: 'Goblin C', speed: 6, icon: '👺', hp: 26, totalHp: 26, attack: 6, defence: 1 },
    { id: 'stress-goblin-d', name: 'Goblin D', speed: 5, icon: '👺', hp: 20, totalHp: 20, attack: 7, defence: 0 },
    { id: 'stress-goblin-e', name: 'Goblin E', speed: 6, icon: '👺', hp: 28, totalHp: 28, attack: 5, defence: 1 },
    { id: 'stress-troll-a', name: 'Troll A', speed: 4, icon: '👹', hp: 45, totalHp: 45, attack: 9, defence: 2 },
    { id: 'stress-troll-b', name: 'Troll B', speed: 4, icon: '👹', hp: 48, totalHp: 48, attack: 8, defence: 2 },
    { id: 'stress-troll-c', name: 'Troll C', speed: 4, icon: '👹', hp: 42, totalHp: 42, attack: 10, defence: 1 },
    { id: 'stress-wolf-a', name: 'Wolf A', speed: 12, icon: '🐺', hp: 16, totalHp: 16, attack: 6, defence: 0 },
    { id: 'stress-wolf-b', name: 'Wolf B', speed: 12, icon: '🐺', hp: 16, totalHp: 16, attack: 6, defence: 0 },
];

type StressGroup = {
    id: string;
    name: string;
    count: number;
    speed: number;
    icon: string;
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
    magicDefence?: number;
};

function expandGroup(group: StressGroup): StressEntry[] {
    const entries: StressEntry[] = [];
    for (let index = 1; index <= group.count; index++) {
        entries.push({
            id: `${group.id}-${index}`,
            name: `${group.name} ${index}`,
            speed: group.speed,
            icon: group.icon,
            hp: group.hp,
            totalHp: group.totalHp,
            attack: group.attack,
            defence: group.defence,
            magicDefence: group.magicDefence ?? 0,
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
            { id: 'stress-recruit-a', name: 'Recruit A', speed: 6, icon: '⚔️', hp: 28, totalHp: 28, attack: 8, defence: 2 },
            { id: 'stress-recruit-b', name: 'Recruit B', speed: 6, icon: '🪓', hp: 28, totalHp: 28, attack: 8, defence: 2 },
        ],
        enemies: [
            ...expandGroup({ id: 'stress-goblin', name: 'Goblin', count: 8, speed: 6, icon: '👺', hp: 24, totalHp: 24, attack: 6, defence: 0 }),
            ...expandGroup({ id: 'stress-troll', name: 'Troll', count: 4, speed: 4, icon: '👹', hp: 45, totalHp: 45, attack: 9, defence: 2, magicDefence: 2 }),
            ...expandGroup({ id: 'stress-wolf', name: 'Wolf', count: 4, speed: 12, icon: '🐺', hp: 16, totalHp: 16, attack: 6, defence: 0 }),
        ],
    },
    huge: {
        allies: [
            ...SMALL_ALLIES,
            ...expandGroup({ id: 'stress-soldier', name: 'Soldier', count: 9, speed: 6, icon: '🛡️', hp: 26, totalHp: 26, attack: 9, defence: 1 }),
        ],
        enemies: [
            ...expandGroup({ id: 'stress-goblin', name: 'Goblin', count: 16, speed: 6, icon: '👺', hp: 22, totalHp: 22, attack: 5, defence: 0 }),
            ...expandGroup({ id: 'stress-troll', name: 'Troll', count: 8, speed: 4, icon: '👹', hp: 42, totalHp: 42, attack: 8, defence: 2, magicDefence: 2 }),
            ...expandGroup({ id: 'stress-wolf', name: 'Wolf', count: 6, speed: 12, icon: '🐺', hp: 15, totalHp: 15, attack: 5, defence: 0 }),
        ],
    },
    giant: {
        allies: [
            ...SMALL_ALLIES,
            ...expandGroup({ id: 'stress-soldier', name: 'Soldier', count: 40, speed: 6, icon: '⚔️', hp: 26, totalHp: 26, attack: 9, defence: 1 }),
            ...expandGroup({ id: 'stress-archer', name: 'Archer', count: 20, speed: 6, icon: '🏹', hp: 22, totalHp: 22, attack: 10, defence: 0 }),
            ...expandGroup({ id: 'stress-knight', name: 'Knight', count: 14, speed: 5, icon: '🛡️', hp: 32, totalHp: 32, attack: 12, defence: 3 }),
        ],
        enemies: [
            ...expandGroup({ id: 'stress-goblin', name: 'Goblin', count: 60, speed: 6, icon: '👺', hp: 20, totalHp: 20, attack: 5, defence: 0 }),
            ...expandGroup({ id: 'stress-troll', name: 'Troll', count: 30, speed: 4, icon: '👹', hp: 40, totalHp: 40, attack: 8, defence: 2, magicDefence: 2 }),
            ...expandGroup({ id: 'stress-wolf', name: 'Wolf', count: 30, speed: 12, icon: '🐺', hp: 14, totalHp: 14, attack: 5, defence: 0 }),
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
                magicDefence: entry.magicDefence ?? 0,
                speed: entry.speed,
                hp: entry.hp,
                totalHp: entry.totalHp,
            }),
        }),
        interval: intervalFromSpeed(entry.speed),
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
    return new IntervalCombat().resolve(left, right, {
        maxTicks: STRESS_MAX_TICKS[size],
        ...options,
        damageResolver: generalAttackResolver,
    });
}
