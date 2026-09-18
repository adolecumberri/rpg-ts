export type DropEntry = {
    itemId: string;
    // Independent drop probability in the [0, 1] range.
    chance: number;
    minQty: number;
    maxQty: number;
};

export class DropTable {
    constructor(public readonly entries: DropEntry[]) {}
}
