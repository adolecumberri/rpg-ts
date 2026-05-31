import { Place } from "../src/world/models/Place";
import { World } from "../src/world/models/World";

describe("World + Place navigation", () => {
    it("stores multiple places inside World and resolves travel", () => {
        const world = new World({
            places: [
                {
                    id: "town_a",
                    name: "Town A",
                    type: "town",
                    connections: [{ to: "town_b" }],
                },
                {
                    id: "town_b",
                    name: "Town B",
                    type: "town",
                    connections: [{ to: "town_a" }],
                },
            ],
            startPlaceId: "town_a",
        });

        const result = world.travelFromCurrent({ to: "town_b" });

        expect(result.from.id).toBe("town_a");
        expect(result.to.id).toBe("town_b");
        expect(world.currentPlaceId).toBe("town_b");
        expect(world.getAllPlaces().length).toBe(2);
    });

    it("triggers place events only once on enter by default", () => {
        const world = new World({
            places: [
                {
                    id: "road",
                    name: "Road",
                    type: "wild",
                    connections: [{ to: "camp" }],
                },
                {
                    id: "camp",
                    name: "Camp",
                    type: "town",
                    connections: [{ to: "road" }],
                    events: [{ id: "intro_camp" }],
                },
            ],
            startPlaceId: "road",
        });

        const firstVisit = world.travelFromCurrent({ to: "camp" });
        world.travelFromCurrent({ to: "road" });
        const secondVisit = world.travelFromCurrent({ to: "camp" });

        expect(firstVisit.triggeredEvents).toHaveLength(1);
        expect(firstVisit.triggeredEvents[0].id).toBe("intro_camp");
        expect(secondVisit.triggeredEvents).toHaveLength(0);
    });

    it("allows travel from Place.travelTo and forwards travel info", () => {
        const world = new World({
            places: [
                {
                    id: "start",
                    name: "Start",
                    type: "town",
                    connections: [{ to: "gate", requiredFlags: ["gate_open"] }],
                },
                {
                    id: "gate",
                    name: "Gate",
                    type: "city",
                    connections: [{ to: "start" }],
                    events: [{ id: "gate_entry" }],
                },
            ],
            startPlaceId: "start",
        });

        const start = world.getPlace("start");
        const received: string[] = [];

        const result = start.travelTo({
            to: "gate",
            world,
            info: {
                playerId: "hero_1",
                unlockedFlags: ["gate_open"],
                data: { source: "quest_01" },
            },
            onEvent: ({ event, info }) => {
                if (info?.playerId === "hero_1") {
                    received.push(event.id);
                }
            },
        });

        expect(result.to.id).toBe("gate");
        expect(received).toEqual(["gate_entry"]);
    });

    it("blocks travel when required flags are missing", () => {
        const world = new World({
            places: [
                {
                    id: "town",
                    name: "Town",
                    type: "town",
                    connections: [{ to: "castle", requiredFlags: ["castle_pass"] }],
                },
                {
                    id: "castle",
                    name: "Castle",
                    type: "city",
                    connections: [{ to: "town" }],
                },
            ],
            startPlaceId: "town",
        });

        expect(() =>
            world.travelFromCurrent({
                to: "castle",
                info: { unlockedFlags: [] },
            }),
        ).toThrow("Cannot travel from town to castle.");
    });

    it("can register a pre-built Place instance", () => {
        const world = new World();
        const place = new Place({
            id: "solo",
            name: "Solo",
            type: "town",
            connections: [],
        });

        world.addPlace(place);

        expect(world.hasPlace("solo")).toBe(true);
        expect(world.getPlace("solo").id).toBe("solo");
    });
});
