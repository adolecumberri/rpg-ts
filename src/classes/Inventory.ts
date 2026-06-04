import { Item } from "./items/Item";

export class Inventory {
    private items: Item[] = [];

    addItem(item: Item) {
        this.items.push(item);
    }

    removeItem(itemId: string) {
        const index = this.items.findIndex(i => i.id === itemId);

        if (index >= 0) {
            this.items.splice(index, 1);
        }
    }

    getAll(): Item[] {
        return [...this.items];
    }

    hasItem(itemId: string): boolean {
        return this.items.some(i => i.id === itemId);
    }
}