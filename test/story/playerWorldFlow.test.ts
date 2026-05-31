import { Character } from "../../src/classes/Character";
import { Player } from "../../src/world/models/Player";
import { World } from "../../src/world/models/World";

describe("Story flow scaffolding", () => {
    it("creates a world line and starts player in the middle town", () => {
        const world = new World({
            places: [
                {
                    id: "town_1",
                    name: "Town 1",
                    type: "town",
                    options: [],
                    connections: [{ to: "town_2" }],
                },
                {
                    id: "town_2",
                    name: "Town 2",
                    type: "town",
                    options: [],
                    connections: [{ to: "town_1" }, { to: "town_3" }],
                },
                {
                    id: "town_3",
                    name: "Town 3",
                    type: "town",
                    options: [],
                    connections: [{ to: "town_2" }],
                },
            ],
            startPlaceId: "town_2",
        });

        const player = new Player({
            name: "hero",
            startPlaceId: "town_2",
        });

        expect(world.getAllPlaces()).toHaveLength(3);
        expect(player.currentPlaceId).toBe("town_2");

        const options = player.lookOptions(world);
        expect(options).toEqual([]);
    });

    it("stores player actions and enforces max 4 team members", () => {
        const world = new World({
            places: [
                {
                    id: "town_1",
                    name: "Town 1",
                    type: "town",
                    options: [],
                    connections: [{ to: "town_2" }],
                },
                {
                    id: "town_2",
                    name: "Town 2",
                    type: "town",
                    options: [],
                    connections: [{ to: "town_1" }, { to: "town_3" }],
                },
                {
                    id: "town_3",
                    name: "Town 3",
                    type: "town",
                    options: [],
                    connections: [{ to: "town_2" }],
                },
            ],
            startPlaceId: "town_2",
        });

        const player = new Player({
            name: "hero",
            startPlaceId: "town_2",
        });

        player.addCharacter(new Character({ id: "c1" }));
        player.addCharacter(new Character({ id: "c2" }));
        player.addCharacter(new Character({ id: "c3" }));
        player.addCharacter(new Character({ id: "c4" }));

        expect(player.team.count()).toBe(4);

        expect(() => player.addCharacter(new Character({ id: "c5" }))).toThrow(
            "Player team is full (max 4).",
        );

        player.travelTo(world, "town_3");

        expect(player.currentPlaceId).toBe("town_3");

        const actions = player.getActions();
        expect(actions.length).toBeGreaterThan(0);
        expect(actions.some((action) => action.type === "travel")).toBe(true);
        expect(actions.some((action) => action.type === "add_character")).toBe(true);
    });
});
