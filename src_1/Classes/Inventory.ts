import { Character } from "./Character";
import { Item } from "./Items/Item";
import { UsableItem } from "./Items/UsableItem";

/**
 * Tipos que el inventario puede almacenar.
 */
export type InventoryItem = Item | UsableItem;

/**
 * Definición de un slot en el inventario.
 */
export type InventorySlot = {
    id: string;
    item: InventoryItem;
    quantity: number;
};

type InventoryConstructor = {
    slots?: InventorySlot[];
};

/**
 * Inventario clásico con slots de objetos.
 */
class Inventory {
    private slots: Map<string, InventorySlot> = new Map();

    constructor(params?: InventoryConstructor) {
        if (params?.slots) {
            params.slots.forEach((slot) => {
                this.slots.set(slot.id, slot);
            });
        }
    }

    /**
     * Añadir un objeto al inventario.
     * Si ya existe uno igual (por id de definición), acumula la cantidad.
     */
    addItem(item: InventoryItem, quantity: number = 1) {
        const id = this.getItemId(item);

        const existing = this.slots.get(id);
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.slots.set(id, {
                id,
                item,
                quantity,
            });
        }
    }

    /**
     * Retira una cantidad de un objeto.
     * Si la cantidad llega a 0, elimina el slot.
     */
    removeItem(item: InventoryItem, quantity: number = 1) {
        const id = this.getItemId(item);
        const existing = this.slots.get(id);

        if (!existing) return;

        existing.quantity -= quantity;
        if (existing.quantity <= 0) {
            this.slots.delete(id);
        }
    }

    /**
     * Devuelve un objeto si existe, o undefined.
     */
    getItem(itemId: string): InventoryItem | undefined {
        return this.slots.get(itemId)?.item;
    }

    /**
     * Devuelve todos los objetos del inventario.
     */
    getAllItems(): InventorySlot[] {
        return Array.from(this.slots.values());
    }

    /**
     * Usa un objeto si es de tipo `UsableItem`.
     */
    useItem({ itemId, target, ...args }: { itemId: string; target: Character;[key: string]: any }) {
        const slot = this.slots.get(itemId);
        if (!slot) throw new Error(`El objeto con id ${itemId} no está en el inventario.`);

        if (slot.item instanceof UsableItem) {
            slot.item.use(target);
            this.removeItem(slot.item, 1);
        } else {
            throw new Error("Solo los objetos de tipo UsableItem pueden usarse directamente.");
        }
    }

    /**
     * Equipa un objeto si es de tipo `Item`.
     */
    equipItem({ itemId, target, ...args }: { itemId: string; target: Character;[key: string]: any }) {
        const slot = this.slots.get(itemId);
        if (!slot) throw new Error(`El objeto con id ${itemId} no está en el inventario.`);

        if (slot.item instanceof Item) {
            slot.item.equip(target);
        } else {
            throw new Error("Solo los objetos de tipo Item pueden equiparse.");
        }
    }

    /**
     * Devuelve el número de objetos en el inventario.
     */
    count(): number {
        return this.slots.size;
    }

    /**
     * Limpia el inventario.
     */
    clear() {
        this.slots.clear();
    }

    private getItemId(item: InventoryItem): string {
        // Si el ItemDefinition tiene un id único, úsalo. 
        // Si no, se usa el nombre o una referencia simple.
        return String(item.definition?.id) ?? item.definition?.name ?? "unknown_item";
    }
};

export { Inventory };

