import { Character } from "../../src";
import { Place, PlaceId, PlaceOption, Player, TravelInfo, World } from "../../src/world";
import { MenuChoice } from "../Menu";
import { buildPlaceOptionChoice } from "../handlers/placeOptionHandler";

export type MenuBuildDependencies = {
    player: Player;
    world: World;
    townResidents: Record<PlaceId, Character[]>;
    waitForAnyKey: (message: string) => Promise<void>;
    printHistory: () => void;
    printPartyStats: () => void;
    getResidentEnemy: (placeId: PlaceId) => Character | undefined;
    fightResident: (placeId: PlaceId, enemy: Character) => Promise<boolean>;
    onPlaceEnter: (placeId: PlaceId) => Promise<void>;
};

export function renderHeader(place: Place, dependencies: MenuBuildDependencies): string {
    const teamNames = dependencies.player.team
        .getAll()
        .map((member) => member.name)
        .join(", ");

    const residents = dependencies.townResidents[place.id] ?? [];
    const residentNames = residents.length > 0
        ? residents.map((resident) => resident.name).join(", ")
        : "None";

    return [
        "WORLD TEST",
        "==========",
        `Location: ${place.definition.name} (${place.id})`,
        `Team: ${teamNames || "Empty"}`,
        `NPCs here: ${residentNames}`,
        "",
        `Description: ${place.definition.description ?? "No description yet."}`,
        "",
        "Choose an option:",
    ].join("\n");
}

export function buildMenuOptions(place: Place, dependencies: MenuBuildDependencies): MenuChoice[] {
    const menu: MenuChoice[] = [];

    const residentToFight = dependencies.getResidentEnemy(place.id);
    if (residentToFight) {
        menu.push({
            label: `Fight ${residentToFight.name}`,
            execute: async () => dependencies.fightResident(place.id, residentToFight),
        });
    }

    const placeOptions = dependencies.player.lookOptions(dependencies.world);
    for (const option of placeOptions) {
        menu.push(buildPlaceOptionChoice(option, dependencies));
    }

    for (const connection of place.getConnections()) {
        const destination = dependencies.world.getPlace(connection.to);
        menu.push({
            label: `Travel to ${destination.definition.name}`,
            execute: async () => {
                const info: TravelInfo = {
                    data: {
                        source: "terminal_menu",
                    },
                };
                dependencies.player.travelTo(dependencies.world, destination.id, info);
                await dependencies.onPlaceEnter(destination.id);
                return true;
            },
        });
    }

    menu.push({
        label: "Show action history",
        execute: async () => {
            dependencies.printHistory();
            await dependencies.waitForAnyKey("Press any key to continue...");
            return true;
        },
    });

    menu.push({
        label: "Show party + stats",
        execute: async () => {
            dependencies.printPartyStats();
            await dependencies.waitForAnyKey("Press any key to continue...");
            return true;
        },
    });

    menu.push({
        label: "Exit",
        execute: async () => false,
    });

    return menu;
}
