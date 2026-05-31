import * as readline from "readline";
import { Character, Stats } from "../src";
import { Player, Place, PlaceId, PlaceOption, TravelInfo, World } from "../src/world";

type MenuChoice = {
    label: string;
    execute: () => Promise<boolean>;
};

const world = new World({
    places: [
        {
            id: "town_1",
            name: "North Town",
            type: "town",
            description: "A quiet town to the north. The wind smells like pine and smoke.",
            options: [],
            connections: [{ to: "town_2" }],
        },
        {
            id: "town_2",
            name: "Central Town",
            type: "town",
            description: "You stand at the crossroads in the center of the region.",
            options: [],
            connections: [{ to: "town_1" }, { to: "town_3" }],
        },
        {
            id: "town_3",
            name: "South Town",
            type: "town",
            description: "A market town full of travelers and carts.",
            options: [],
            connections: [{ to: "town_2" }],
        },
    ],
    startPlaceId: "town_2",
});

const player = new Player({
    name: "Hero",
    startPlaceId: "town_2",
});

const townResidents: Record<PlaceId, Character[]> = {
    town_1: [],
    town_2: [],
    town_3: [],
};

async function main(): Promise<void> {
    await runCharacterDraft();

    let running = true;

    while (running) {
        const current = world.getPlace(player.currentPlaceId);
        const options = buildMenuOptions(current);

        const selected = await selectMenuOption(renderHeader(current), options);
        running = await options[selected].execute();
    }

    cleanupInput();
    process.stdout.write("\nGoodbye.\n");
}

function renderHeader(place: Place): string {
    const teamNames = player.team
        .getAll()
        .map((member) => member.name)
        .join(", ");

    const residents = townResidents[place.id] ?? [];
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

async function runCharacterDraft(): Promise<void> {
    const candidates = buildRandomCharacterCandidates(3);

    const options: MenuChoice[] = candidates.map((candidate) => ({
        label: describeCharacter(candidate),
        execute: async () => true,
    }));

    const selected = await selectMenuOption(
        [
            "CHARACTER DRAFT",
            "===============",
            "Choose your starting character:",
        ].join("\n"),
        options,
    );

    const chosenCharacter = candidates[selected];
    player.addCharacter(chosenCharacter);

    const unselected = candidates.filter((_candidate, index) => index !== selected);
    townResidents.town_1 = [unselected[0]];
    townResidents.town_3 = [unselected[1]];

    await waitForAnyKey([
        `You chose ${chosenCharacter.name}.`,
        `${unselected[0].name} is now in North Town.`,
        `${unselected[1].name} is now in South Town.`,
        "",
        "Press any key to begin your journey...",
    ].join("\n"));
}

function buildRandomCharacterCandidates(amount: number): Character[] {
    const candidates: Character[] = [];

    for (let i = 0; i < amount; i += 1) {
        const totalHp = randomInt(9, 16);
        const character = new Character({
            name: buildRandomName(),
            stats: new Stats({
                attack: randomInt(2, 8),
                defence: randomInt(1, 7),
                totalHp,
                hp: totalHp,
            }),
        });

        candidates.push(character);
    }

    return candidates;
}

function buildRandomName(): string {
    const prefixes = ["Ar", "Bel", "Cor", "Dra", "Ela", "Fen", "Gal", "Ira", "Ka", "Mor", "Nya", "Tor"];
    const suffixes = ["dor", "wen", "rik", "lian", "mar", "thas", "ren", "vok", "riel", "dun", "zar", "fin"];
    return `${pick(prefixes)}${pick(suffixes)}`;
}

function describeCharacter(character: Character): string {
    return `${character.name} | ATK ${character.stats.attack} | DEF ${character.stats.defence} | HP ${character.stats.hp}`;
}

function pick<T>(list: T[]): T {
    return list[randomInt(0, list.length - 1)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildMenuOptions(place: Place): MenuChoice[] {
    const menu: MenuChoice[] = [];

    const placeOptions = player.lookOptions(world);
    for (const option of placeOptions) {
        menu.push(buildPlaceOptionChoice(option));
    }

    for (const connection of place.getConnections()) {
        const destination = world.getPlace(connection.to);
        menu.push({
            label: `Travel to ${destination.definition.name}`,
            execute: async () => {
                const info: TravelInfo = {
                    data: {
                        source: "terminal_menu",
                    },
                };
                player.travelTo(world, destination.id, info);
                return true;
            },
        });
    }

    menu.push({
        label: "Show action history",
        execute: async () => {
            printHistory();
            await waitForAnyKey("Press any key to continue...");
            return true;
        },
    });

    menu.push({
        label: "Exit",
        execute: async () => false,
    });

    return menu;
}

function buildPlaceOptionChoice(option: PlaceOption): MenuChoice {
    return {
        label: option.label,
        execute: async () => {
            const payload = option.payload ?? {};
            const actionType = payload.actionType;

            if (actionType === "travel") {
                const to = payload.to as PlaceId | undefined;
                if (!to) {
                    await waitForAnyKey("Travel option is missing destination. Press any key...");
                    return true;
                }

                player.travelTo(world, to, {
                    data: {
                        source: "place_option",
                        optionId: option.id,
                    },
                });
                return true;
            }

            await waitForAnyKey(`${option.description ?? "No action attached yet."}\n\nPress any key to continue...`);
            return true;
        },
    };
}

function printHistory(): void {
    const history = player.getActions();
    process.stdout.write("\nAction history\n");
    process.stdout.write("-------------\n");

    if (history.length === 0) {
        process.stdout.write("No actions yet.\n\n");
        return;
    }

    for (const action of history) {
        process.stdout.write(`- ${new Date(action.timestamp).toLocaleTimeString()} | ${action.type} | place=${action.placeId ?? "n/a"}\n`);
    }
    process.stdout.write("\n");
}

async function selectMenuOption(header: string, options: MenuChoice[]): Promise<number> {
    return new Promise((resolve) => {
        ensureInputReady();
        let selected = 0;

        const render = () => {
            console.clear();
            process.stdout.write(`${header}\n\n`);
            options.forEach((option, index) => {
                const pointer = index === selected ? ">" : " ";
                process.stdout.write(`${pointer} ${index + 1}. ${option.label}\n`);
            });
            process.stdout.write("\nUse Arrow Up/Down + Enter, or press a number.\n");
        };

        const cleanup = () => {
            process.stdin.removeListener("keypress", onKeyPress);
        };

        const onKeyPress = (str: string, key: { name?: string; sequence?: string; ctrl?: boolean }) => {
            if (key.ctrl && key.name === "c") {
                cleanup();
                cleanupInput();
                process.exit(0);
            }

            if (key.name === "up") {
                selected = selected <= 0 ? options.length - 1 : selected - 1;
                render();
                return;
            }

            if (key.name === "down") {
                selected = selected >= options.length - 1 ? 0 : selected + 1;
                render();
                return;
            }

            if (key.name === "return") {
                cleanup();
                resolve(selected);
                return;
            }

            const keyText = key.sequence ?? str;
            if (/^[1-9]$/.test(keyText)) {
                const numeric = Number(keyText) - 1;
                if (numeric >= 0 && numeric < options.length) {
                    cleanup();
                    resolve(numeric);
                }
            }
        };

        process.stdin.on("keypress", onKeyPress);
        render();
    });
}

async function waitForAnyKey(message: string): Promise<void> {
    ensureInputReady();
    process.stdout.write(`\n${message}\n`);

    await new Promise<void>((resolve) => {
        const done = () => {
            process.stdin.removeListener("keypress", onKeyPress);
            resolve();
        };

        const onKeyPress = (_str: string, key: { ctrl?: boolean; name?: string }) => {
            if (key.ctrl && key.name === "c") {
                cleanupInput();
                process.exit(0);
            }
            done();
        };

        process.stdin.on("keypress", onKeyPress);
    });
}

let inputInitialized = false;

function ensureInputReady(): void {
    if (inputInitialized) return;

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    inputInitialized = true;
}

function cleanupInput(): void {
    if (!inputInitialized) return;

    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    inputInitialized = false;
}

main().catch((error) => {
    cleanupInput();
    console.error(error);
    process.exit(1);
});
