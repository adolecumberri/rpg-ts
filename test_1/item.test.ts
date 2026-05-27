import { Character } from "../src/Classes/Character";
import { Item } from "../src/Classes/Items/Item";

// Mock básico para los efectos de stats
const mockAddModifier = jest.fn();
const mockRevert = jest.fn();

describe("Item", () => {
    let mockCharacter: Character;

    beforeEach(() => {
        mockAddModifier.mockClear();
        mockRevert.mockClear();

        // Simula un Character con un objeto stats "falso"
        mockCharacter = new Character();
        mockCharacter.stats = {
            addModifier: mockAddModifier,
            revert: mockRevert,
            getProp: jest.fn(),
            setProp: jest.fn(),
        } as any;
    });

    test("1️⃣ Crea un item correctamente con definición básica", () => {
        const item = new Item({
            id: "sword_001",
            name: "Sword of Light",
            description: "A powerful sword.",
        });

        expect(item.id).toBe("sword_001");
        expect(item.name).toBe("Sword of Light");
        expect(item.description).toBe("A powerful sword.");
        expect(item.definition.name).toBe("Sword of Light");
    });

    test("2️⃣ Ejecuta la función onEquip cuando se equipa", () => {
        const onEquipMock = jest.fn();

        const item = new Item({
            id: "armor_01",
            name: "Steel Armor",
            onEquip: onEquipMock,
            effects: [],
        });

        item.equip(mockCharacter);

        expect(onEquipMock).toHaveBeenCalledTimes(1);
        expect(onEquipMock).toHaveBeenCalledWith(item, mockCharacter);
    });

    test("3️⃣ Añade efectos al equiparse", () => {
        const item = new Item({
            id: "ring_01",
            name: "Ring of Power",
            effects: [
                { stat: "strength" as any, typeOfModification: "BUFF_FIXED", value: 5 },
                { stat: "agility" as any, typeOfModification: "BUFF_PERCENTAGE", value: 20 },
            ],
        });

        item.equip(mockCharacter);

        expect(mockAddModifier).toHaveBeenCalledTimes(2);
        expect(mockAddModifier).toHaveBeenCalledWith("strength", "BUFF_FIXED", 5);
        expect(mockAddModifier).toHaveBeenCalledWith("agility", "BUFF_PERCENTAGE", 20);
    });

    test("4️⃣ Ejecuta onUnEquip y revierte efectos", () => {
        const onUnEquipMock = jest.fn();

        const item = new Item({
            id: "helm_01",
            name: "Golden Helm",
            onUnEquip: onUnEquipMock,
            effects: [
                { stat: "defense" as any, typeOfModification: "BUFF_FIXED", value: 10 },
            ],
        });

        item.unEquip(mockCharacter);

        expect(onUnEquipMock).toHaveBeenCalledTimes(1);
        expect(onUnEquipMock).toHaveBeenCalledWith(item, mockCharacter);
        expect(mockRevert).toHaveBeenCalledTimes(1);
        expect(mockRevert).toHaveBeenCalledWith("defense", "BUFF_FIXED", 10);
    });

    test("5️⃣ No falla si no hay callbacks ni efectos definidos", () => {
        const item = new Item({
            id: "empty_01",
            name: "Broken Stick",
        });

        expect(() => item.equip(mockCharacter)).not.toThrow();
        expect(() => item.unEquip(mockCharacter)).not.toThrow();

        expect(mockAddModifier).not.toHaveBeenCalled();
        expect(mockRevert).not.toHaveBeenCalled();
    });
});