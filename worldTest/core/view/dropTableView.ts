import type { WorldSession } from '../session';
import type { DropTable } from '../loot/dropTable';
import type { ItemTable } from '../loot/itemTable';
import { BANDIT_DROP } from '../world';

export type DropTableRow = {
    itemId: string;
    itemName: string;
    chance: number;
    minQty: number;
    maxQty: number;
};

export type DropTableSummary = {
    source: string;
    rows: DropTableRow[];
};

export function dropTableRows(table: DropTable | undefined, itemTable: ItemTable): DropTableRow[] {
    if (!table) return [];
    return table.entries.map((entry) => ({
        itemId: entry.itemId,
        itemName: itemTable.get(entry.itemId)?.name ?? entry.itemId,
        chance: entry.chance,
        minQty: entry.minQty,
        maxQty: entry.maxQty,
    }));
}

/**
 * Reference view of every creature's drop table (grunt npcs, special
 * encounters and the bandit group).
 */
export function dropTableSummaries(session: WorldSession): DropTableSummary[] {
    const summaries: DropTableSummary[] = [];

    for (const npc of session.allNpcs()) {
        if (npc.dropTable) {
            summaries.push({ source: npc.character.name, rows: dropTableRows(npc.dropTable, session.itemTable) });
        }
    }

    for (const special of session.specials) {
        if (special.dropTable) {
            summaries.push({ source: special.name, rows: dropTableRows(special.dropTable, session.itemTable) });
        }
    }

    summaries.push({ source: 'Bandits', rows: dropTableRows(BANDIT_DROP, session.itemTable) });
    return summaries;
}
