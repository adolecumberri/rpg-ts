import type { IconId } from '../components/UI/Icon';

/**
 * The catalog of displayed stats, in order — shared by every stats
 * view (character page, equipment page, item previews).
 */
export type StatKey =
    | 'attack'
    | 'defence'
    | 'magicDefence'
    | 'speed'
    | 'magic'
    | 'critChance'
    | 'critMultiplier';

export type StatEntry = {
    key: StatKey;
    icon: IconId;
    label: string;
    suffix?: string;
    prefix?: string;
};

export const STAT_CATALOG: StatEntry[] = [
    { key: 'attack', icon: 'atqFisico', label: 'Atq. físico' },
    { key: 'defence', icon: 'defence', label: 'Def. física' },
    { key: 'magicDefence', icon: 'defensaMagica', label: 'Def. mágica' },
    { key: 'speed', icon: 'speed', label: 'Rapidez' },
    { key: 'magic', icon: 'poderMagico', label: 'Poder mágico' },
    { key: 'critChance', icon: 'critChance', label: 'Crit.', suffix: '%' },
    { key: 'critMultiplier', icon: 'critMultiplier', label: 'Crit. Mult.', prefix: '×' },
];
