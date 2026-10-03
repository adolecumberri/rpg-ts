import type { Item } from '@rpg';
import { STAT_CATALOG } from './statCatalog';
import type { StatKey } from './statCatalog';
import type { StatRow } from '../components/UI/StatsColumn';

const KNOWN_KEYS: StatKey[] = STAT_CATALOG.map((entry) => entry.key);

/**
 * The stats the given items give, as column rows — the WHOLE catalog,
 * every row present: stats the items do not provide render with an
 * empty value (the equipment page shows the complete table).
 */
export function statsOfItems(items: Item[]): StatRow[] {
    const totals = new Map<StatKey, number>();
    for (const item of items) {
        for (const effect of item.definition.effects ?? []) {
            if (effect.typeOfModification !== 'BUFF_FIXED') continue;
            const key = effect.stat as StatKey;
            if (KNOWN_KEYS.indexOf(key) === -1) continue;
            totals.set(key, (totals.get(key) ?? 0) + effect.value);
        }
    }
    return STAT_CATALOG.map((entry) => {
        const value = totals.get(entry.key) ?? 0;
        return {
            icon: entry.icon,
            label: entry.label,
            value: value === 0 ? '' : `${value > 0 ? '+' : ''}${value}${entry.suffix ?? ''}`,
        };
    });
}
