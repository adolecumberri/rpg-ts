import { Character } from "../src/Classes/Character";
import { UsableItem } from "../src/Classes/Items/UsableItem";

describe("UsableItem", () => {
    let mockCharacter: Character;

    beforeEach(() => {
        mockCharacter = new Character();
    });

    test("1️⃣ Crea un usable item correctamente con sus propiedades", () => {
        const usable = new UsableItem({
            id: "potion_001",
            name: "Health Potion",
            description: "Restores 50 HP",
        });

        expect(usable.id).toBe("potion_001");
        expect(usable.name).toBe("Health Potion");
        expect(usable.description).toBe("Restores 50 HP");
        expect(usable.definition.name).toBe("Health Potion");
    });

    test("2️⃣ Ejecuta la función onUse cuando se usa", () => {
        const onUseMock = jest.fn();

        const usable = new UsableItem({
            id: "scroll_001",
            name: "Scroll of Fire",
            onUse: onUseMock,
        });

        usable.use(mockCharacter, "extraParam");

        expect(onUseMock).toHaveBeenCalledTimes(1);
        // Verifica que se llama con (item, target, args)
        expect(onUseMock).toHaveBeenCalledWith(usable, mockCharacter, ["extraParam"]);
    });

    test("3️⃣ No falla al usar un objeto sin onUse definido", () => {
        const usable = new UsableItem({
            id: "empty_scroll",
            name: "Blank Scroll",
        });

        expect(() => usable.use(mockCharacter)).not.toThrow();
    });

    test("4️⃣ Pasa múltiples argumentos correctamente a onUse", () => {
        const onUseMock = jest.fn();
        const usable = new UsableItem({
            id: "bomb_01",
            name: "Fire Bomb",
            onUse: onUseMock,
        });

        usable.use(mockCharacter, 10, "explosive", { radius: 5 });

        expect(onUseMock).toHaveBeenCalledWith(
            usable,
            mockCharacter,
            [10, "explosive", { radius: 5 }]
        );
    });

    test("5️⃣ Genera un id único si no se proporciona", () => {
        const usable = new UsableItem({
            name: "Mana Potion",
            description: "Restores mana over time",
        });

        expect(typeof usable.id).toBe("string");
        expect((usable.id as string).length).toBeGreaterThan(0);
    });
});
