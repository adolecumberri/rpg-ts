import type { DropTable } from './dropTable';

export type LootDrop = {
    itemId: string;
    quantity: number;
};

/**
 * Rolls a drop table. The random source is injectable so rolls are
 * fully deterministic in unit tests.
 */
export class LootRoller {
    constructor(private readonly random: () => number = Math.random) {}

    roll(table: DropTable): LootDrop[] {
        const drops: LootDrop[] = [];
        for (const entry of table.entries) {
            if (this.random() < entry.chance) {
                const span = entry.maxQty - entry.minQty + 1;
                const quantity = entry.minQty + Math.floor(this.random() * span);
                drops.push({ itemId: entry.itemId, quantity });
            }
        }
        return drops;
    }
}
