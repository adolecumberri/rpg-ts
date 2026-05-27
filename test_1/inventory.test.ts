import { Character } from "../src/Classes/Character";
import { Inventory } from "../src/Classes/Inventory";
import { Item } from "../src/Classes/Items/Item";
import { UsableItem } from "../src/Classes/Items/UsableItem";
import { Stats } from "../src/Classes/Stats";


describe("Inventory", () => {
    let mockCharacter: Character;

    beforeEach(() => {
        // Mock mínimo de Character (solo lo necesario para probar)
        mockCharacter = new Character({
            name: "Hero",
            stats: new Stats({
                addModifier: jest.fn(),
                revert: jest.fn(),
            }),
        });
    });

    test("1️⃣ Añadir items al inventario y verificar conteo", () => {
        const inventory = new Inventory();

        const sword = new Item({ id: "sword_001", name: "Espada" });
        const shield = new Item({ id: "shield_001", name: "Escudo" });

        inventory.addItem(sword);
        inventory.addItem(shield, 2);

        const allItems = inventory.getAllItems();

        expect(inventory.count()).toBe(2);
        expect(allItems[0].item).toBeInstanceOf(Item);
        expect(allItems[1].quantity).toBe(2);
    });

    test("2️⃣ Equipar items correctamente con Character", () => {
        const inventory = new Inventory();

        const mockEquip = jest.fn();
        const sword = new Item({
            id: "sword_001",
            name: "Espada corta",
            onEquip: mockEquip,
            effects: [{ stat: "attack", typeOfModification: "BUFF_FIXED", value: 5 }],
        });

        inventory.addItem(sword);

        inventory.equipItem({ itemId: "sword_001", target: mockCharacter });

        // Se debe haber llamado al método onEquip
        expect(mockEquip).toHaveBeenCalled();
    });

    test("3️⃣ Usar objetos de tipo UsableItem reduce cantidad", () => {
        const inventory = new Inventory();

        const mockUse = jest.fn();
        const potion = new UsableItem({
            id: "potion_001",
            name: "Poción de curación",
            onUse: mockUse,
        });

        inventory.addItem(potion, 2);

        inventory.useItem({ itemId: "potion_001", target: mockCharacter });

        // Debe haberse ejecutado la acción
        expect(mockUse).toHaveBeenCalled();

        // La cantidad debe haber disminuido en 1
        const remaining = inventory.getAllItems()[0].quantity;
        expect(remaining).toBe(1);
    });

    test("4️⃣ Quitar items del inventario cuando la cantidad llega a 0", () => {
        const inventory = new Inventory();

        const sword = new Item({ id: "sword_001", name: "Espada" });

        inventory.addItem(sword, 1);
        expect(inventory.count()).toBe(1);

        inventory.removeItem(sword, 1);
        expect(inventory.count()).toBe(0);
    });

    test("5️⃣ Intentar equipar un objeto que no existe lanza error", () => {
        const inventory = new Inventory();

        expect(() => {
            inventory.equipItem({ itemId: "inexistente", target: mockCharacter });
        }).toThrow("El objeto con id inexistente no está en el inventario.");
    });

    test("6️⃣ Intentar usar un objeto que no es UsableItem lanza error", () => {
        const inventory = new Inventory();
        const sword = new Item({ id: "sword_001", name: "Espada" });
        inventory.addItem(sword);

        expect(() =>
            inventory.useItem({ itemId: "sword_001", target: mockCharacter })
        ).toThrow("Solo los objetos de tipo UsableItem pueden usarse directamente.");
    });
});
