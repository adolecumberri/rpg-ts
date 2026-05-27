import { Character } from "../src/Classes/Character";
import { Team } from "../src/Classes/Teams";

describe("Team", () => {
    let hero1: Character;
    let hero2: Character;
    let hero3: Character;

    beforeEach(() => {
        // Mock mínimo de Character, solo con id y nombre
        hero1 = new Character({ id: "char_1" });
        hero2 = new Character({ id: "char_2" });
        hero3 = new Character({ id: "char_3" });
    });

    test("1️⃣ Crear equipo con miembros iniciales", () => {
        const team = new Team({ id: "team_1", members: [hero1, hero2] });
        expect(team.count()).toBe(2);
        expect(team.getCharacter("char_1")).toBe(hero1);
        expect(team.getCharacter("char_2")).toBe(hero2);
    });

    test("2️⃣ Añadir un personaje nuevo al equipo", () => {
        const team = new Team({ id: "team_1", members: [hero1] });

        team.addCharacter(hero2);
        expect(team.count()).toBe(2);
        expect(team.getCharacter("char_2")).toBe(hero2);
    });

    test("3️⃣ No permite añadir personajes duplicados", () => {
        const team = new Team({ id: "team_1", members: [hero1] });

        expect(() => team.addCharacter(hero1)).toThrow(
            `Character with id ${hero1.id} already exists in team.`
        );
    });

    test("4️⃣ Eliminar un personaje existente", () => {
        const team = new Team({ id: "team_1", members: [hero1, hero2] });

        team.removeCharacter("char_1");
        expect(team.count()).toBe(1);
        expect(team.getCharacter("char_1")).toBeUndefined();
    });

    test("5️⃣ Lanza error al eliminar un personaje que no existe", () => {
        const team = new Team({ id: "team_1", members: [hero1] });

        expect(() => team.removeCharacter("fake_id")).toThrow(
            "Character with id fake_id does not exist in team."
        );
    });

    test("6️⃣ Obtener todos los miembros devuelve el array correcto", () => {
        const team = new Team({ id: "team_1", members: [hero1, hero2, hero3] });

        const all = team.getAll();
        expect(all).toHaveLength(3);
        expect(all).toContain(hero1);
        expect(all).toContain(hero2);
        expect(all).toContain(hero3);
    });

    test("7️⃣ Obtener un personaje aleatorio devuelve uno del equipo", () => {
        const team = new Team({ id: "team_1", members: [hero1, hero2, hero3] });

        const random = team.getRandomCharacter();
        expect([hero1, hero2, hero3]).toContain(random);
    });

    test("8️⃣ Obtener un personaje aleatorio en un equipo vacío devuelve undefined", () => {
        const team = new Team({ id: "team_1", members: [] });

        expect(team.getRandomCharacter()).toBeUndefined();
    });

    test("9️⃣ Limpiar el equipo elimina todos los miembros", () => {
        const team = new Team({ id: "team_1", members: [hero1, hero2] });

        team.clear();
        expect(team.count()).toBe(0);
        expect(team.getAll()).toHaveLength(0);
    });
});