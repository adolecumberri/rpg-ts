import type { BattleUnit } from '../components/UI/Battlefield';
import { SPRITES } from '../assets/sprites';
import type { SpriteRole } from '../assets/sprites';

/**
 * Fight-gen preset characters: the fixed "species" catalog of the army
 * builder. Each preset owns what a level-1 unit starts with, what each
 * extra level adds, and its sprite role (the farmer renders as a plain
 * icon, it has no sprite art).
 */
export type UnitPreset = {
    id: string;
    name: string;
    icon: string;
    spriteRole?: SpriteRole;
    base: {
        hp: number;
        power: number;
        // Ticks between attacks in ticks mode (warriors swing slower,
        // archers harass faster).
        interval: number;
        reach: 'short' | 'long' | 'all';
    };
    perLevel: {
        hp: number;
        power: number;
    };
};

export const UNIT_PRESETS: UnitPreset[] = [
    {
        id: 'soldier',
        name: 'Soldier',
        icon: '⚔️',
        spriteRole: 'warrior',
        base: { hp: 30, power: 8, interval: 6, reach: 'short' },
        perLevel: { hp: 2, power: 1 },
    },
    {
        id: 'archer',
        name: 'Archer',
        icon: '🏹',
        spriteRole: 'archer',
        base: { hp: 22, power: 6, interval: 4, reach: 'all' },
        perLevel: { hp: 1, power: 1 },
    },
    {
        id: 'mage',
        name: 'Mage',
        icon: '✨',
        spriteRole: 'mage',
        base: { hp: 20, power: 5, interval: 5, reach: 'long' },
        perLevel: { hp: 1, power: 1 },
    },
    {
        id: 'farmer',
        name: 'Farmer',
        icon: '🌾',
        base: { hp: 14, power: 4, interval: 6, reach: 'short' },
        perLevel: { hp: 2, power: 1 },
    },
];

const PRESETS_BY_ID: Record<string, UnitPreset> = UNIT_PRESETS.reduce(
    (acc: Record<string, UnitPreset>, preset) => {
        acc[preset.id] = preset;
        return acc;
    },
    {},
);

/** The preset with the given id, if it exists. */
export function presetById(presetId: string): UnitPreset | undefined {
    return PRESETS_BY_ID[presetId];
}

/**
 * A unit: the BattleUnit contract (what the battlefield renders) plus
 * the fields the fight engines need (power, attack interval, reach).
 */
export type FightUnit = BattleUnit & {
    power: number;
    interval: number;
    reach: 'short' | 'long' | 'all';
};

/** One group of the army builder: a preset, a count, a row and a level. */
export type ArmyGroup = {
    presetId: string;
    count: number;
    row: 'front' | 'center' | 'back';
    level: number;
};

/** The hp and power of a preset at a given level (level 1 = base). */
export function statsAt(preset: UnitPreset, level: number): { hp: number; power: number } {
    const extra = Math.max(0, level - 1);
    return {
        hp: preset.base.hp + preset.perLevel.hp * extra,
        power: preset.base.power + preset.perLevel.power * extra,
    };
}

/**
 * All the units of an army: every group expanded into its count of
 * units, sharing one id space (`${prefix}_0`, `${prefix}_1`...).
 */
export function unitsOfArmy(groups: ArmyGroup[], prefix: string): FightUnit[] {
    const units: FightUnit[] = [];
    for (const group of groups) {
        const preset = presetById(group.presetId);
        if (!preset) continue;
        const { hp, power } = statsAt(preset, group.level);
        for (let index = 0; index < group.count; index++) {
            units.push({
                id: `${prefix}_${units.length}`,
                name: `${preset.name} ${units.length + 1}`,
                icon: preset.icon,
                sprite: preset.spriteRole ? SPRITES[preset.spriteRole] : undefined,
                row: group.row,
                hp,
                maxHp: hp,
                level: group.level,
                power,
                interval: preset.base.interval,
                reach: preset.base.reach,
                sub: `🎯 ${preset.base.reach}`,
            });
        }
    }
    return units;
}
