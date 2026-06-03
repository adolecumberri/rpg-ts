import { Character, Combat, Stats, Team } from "../src";
import { Player, PlaceId, World } from "../src/world";
import { Towns } from "./constants/towns";
import { Menu, MenuChoice } from "./Menu";
import { buildMenuOptions, renderHeader } from "./menu/createMenu";

const world = new World({
    places: Towns,
    startPlaceId: "town_2",
});

const player = new Player({
    name: "Hero",
    startPlaceId: "town_2",
});

let mainCharacterId: string | undefined;

const menu = new Menu();
const combat = new Combat({
    randomTarget: false,
});

const townResidents: Record<PlaceId, Character[]> = {
    town_1: [],
    town_2: [],
    town_3: [],
};

const initialResidentNamesById: Record<string, string> = {};
const defeatedInitialResidentIds: Set<string> = new Set();
let defeatedBothResidentsAnnounced = false;
const innState = {
    uses: 1,
};

async function main(): Promise<void> {
    await runCharacterDraft();
    await handlePlaceEnter(player.currentPlaceId);

    let running = true;

    while (running) {
        const current = world.getPlace(player.currentPlaceId);
        const options = buildMenuOptions(current, {
            player,
            world,
            townResidents,
            waitForAnyKey: menu.waitForAnyKey,
            printHistory,
            printPartyStats,
            getResidentEnemy,
            fightResident,
            onPlaceEnter: handlePlaceEnter,
        });

        const selected = await menu.selectMenuOption(renderHeader(current, {
            player,
            world,
            townResidents,
            waitForAnyKey: menu.waitForAnyKey,
            printHistory,
            printPartyStats,
            getResidentEnemy,
            fightResident,
            onPlaceEnter: handlePlaceEnter,
        }), options);
        running = await options[selected].execute();
    }

    menu.cleanupInput();
    process.stdout.write("\nGoodbye.\n");
}

async function runCharacterDraft(): Promise<void> {
    await offerNewCharacterDraft({
        clearCurrentTeam: false,
        introLines: [
            "Choose your starting character:",
        ],
        outroTemplate: ({ chosenName, northName, southName }) => [
            `You chose ${chosenName}.`,
            `${northName} is now in North Town.`,
            `${southName} is now in South Town.`,
            "",
            "Press any key to begin your journey...",
        ],
    });
}

async function offerNewCharacterDraft(config: {
    clearCurrentTeam: boolean;
    introLines: string[];
    outroTemplate: (args: { chosenName: string; northName: string; southName: string }) => string[];
}): Promise<void> {
    if (config.clearCurrentTeam) {
        player.team.clear();
    }

    resetResidentDefeatTracking();

    const candidates = buildRandomCharacterCandidates(3);

    const options: MenuChoice[] = candidates.map((candidate) => ({
        label: describeCharacter(candidate),
        execute: async () => true,
    }));

    const selected = await menu.selectMenuOption(
        [
            "CHARACTER DRAFT",
            "===============",
            ...config.introLines,
        ].join("\n"),
        options,
    );

    const chosenCharacter = candidates[selected];
    player.addCharacter(chosenCharacter);
    mainCharacterId = chosenCharacter.id;

    const unselected = candidates.filter((_candidate, index) => index !== selected);
    townResidents.town_1 = [unselected[0]];
    townResidents.town_3 = [unselected[1]];

    initialResidentNamesById[unselected[0].id] = unselected[0].name;
    initialResidentNamesById[unselected[1].id] = unselected[1].name;

    await menu.waitForAnyKey(config.outroTemplate({
        chosenName: chosenCharacter.name,
        northName: unselected[0].name,
        southName: unselected[1].name,
    }).join("\n"));
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

function printPartyStats(): void {
    const members = player.team.getAll();

    process.stdout.write("\nParty\n");
    process.stdout.write("-----\n");

    if (members.length === 0) {
        process.stdout.write("No party members yet.\n\n");
        return;
    }

    for (const member of members) {
        const mainTag = member.id === mainCharacterId ? " [MAIN]" : "";
        const hpRatio = member.stats.totalHp > 0 ? member.stats.hp / member.stats.totalHp : 0;
        const lowHpTag = member.stats.hp <= 0
            ? " [DEAD]"
            : hpRatio < 0.25
                ? " [LOW HP]"
                : "";
        process.stdout.write(`${member.name}${mainTag} (${member.id})\n`);
        process.stdout.write(`  LVL ${member.experience.level} | XP ${member.experience.currentXp}/${member.experience.getXpToNextLevel()}\n`);
        process.stdout.write(`  ATK ${member.stats.attack} | DEF ${member.stats.defence} | HP ${member.stats.hp}/${member.stats.totalHp}${lowHpTag}\n`);
    }

    process.stdout.write("\n");
}

function canUseInn(): boolean {
    return innState.uses > 0;
}

function getResidentEnemy(placeId: PlaceId): Character | undefined {
    const residents = townResidents[placeId] ?? [];
    return residents[0];
}

async function fightResident(placeId: PlaceId, enemy: Character): Promise<boolean> {
    const confirmed = await confirmAction(
        `Do you want to fight ${enemy.name}?`,
        "Yes, start battle",
        "No, go back",
    );

    if (!confirmed) {
        return true;
    }

    if (player.team.getAlive().length === 0) {
        await menu.waitForAnyKey([
            "Your party has no alive members.",
            "Recover before starting another fight.",
            "",
            "Press any key to continue...",
        ].join("\n"));
        return true;
    }

    if (enemy.stats.hp <= 0 || enemy.stats.isAlive <= 0) {
        enemy.stats.hp = 1;
        enemy.stats.isAlive = 1;
    }

    const enemyTeam = new Team({
        id: `enemy_${enemy.id}`,
        members: [enemy],
    });

    const result = combat.autoBetweenTeams(player.team, enemyTeam);

    if (result.winner === "draw")
        console.log({ result })

    if (result.winner === "left") {
        const rewardSummary = grantSharedPartyExperience(100);
        recruitEnemy(placeId, enemy);

        const rewardLines = rewardSummary.map((item) => {
            return `${item.name}: +${item.exp} XP${item.levels > 0 ? ` (LEVEL +${item.levels})` : ""}`;
        });

        await menu.waitForAnyKey([
            `You defeated ${enemy.name} in ${result.rounds} rounds.`,
            "XP reward (100 total, shared):",
            ...rewardLines,
            `${enemy.name} joined your party.`,
            "",
            "Press any key to continue...",
        ].join("\n"));
        return true;
    }

    if (result.winner === "right") {
        await menu.waitForAnyKey([
            `${enemy.name} won the fight.`,
            "Recover and try again.",
            "",
            "Press any key to continue...",
        ].join("\n"));

        if (player.team.getAlive().length === 0) {
            await offerNewCharacterDraft({
                clearCurrentTeam: true,
                introLines: [
                    "Your team was defeated.",
                    "Choose 3 new characters:",
                ],
                outroTemplate: ({ chosenName, northName, southName }) => [
                    `You now continue as ${chosenName}.`,
                    `${northName} is now in North Town.`,
                    `${southName} is now in South Town.`,
                    "",
                    "Press any key to continue...",
                ],
            });
        }

        return true;
    }

    console.log({
        result,
        left: player.team.getAlive().map((char) => char.name),
        right: enemy.name,
    })

    await menu.waitForAnyKey([
        "The battle ended in a draw.",
        "",
        "Press any key to continue...",
    ].join("\n"));

    const mutualDefeat = result.leftSurvivors.length === 0 && result.rightSurvivors.length === 0;
    if (mutualDefeat) {
        await offerNewCharacterDraft({
            clearCurrentTeam: true,
            introLines: [
                "Both sides were defeated.",
                "Choose your new character:",
            ],
            outroTemplate: ({ chosenName, northName, southName }) => [
                `You now continue as ${chosenName}.`,
                `${northName} is now in North Town.`,
                `${southName} is now in South Town.`,
                "",
                "Press any key to continue...",
            ],
        });
    }

    return true;
}

function recruitEnemy(placeId: PlaceId, enemy: Character): void {
    const residents = townResidents[placeId] ?? [];
    townResidents[placeId] = residents.filter((resident) => resident.id !== enemy.id);

    registerResidentDefeat(enemy);

    enemy.stats.hp = 1;
    enemy.stats.isAlive = 1;

    player.addCharacter(enemy);
}

async function handlePlaceEnter(placeId: PlaceId): Promise<void> {
    if (placeId !== "inn_1") {
        return;
    }

    if (!canUseInn()) {
        console.log("The Inn is closed.");
        return;
    }

    for (const member of player.team.getAll()) {
        const healAmount = Math.floor(member.stats.totalHp / 2) + 50;
        member.stats.hp = Math.min(member.stats.totalHp, member.stats.hp + healAmount);
        member.stats.isAlive = member.stats.hp > 0 ? 1 : 0;
    }

    innState.uses = 0;
    console.log("The Inn healed your party and is now closed.");
}

function registerResidentDefeat(enemy: Character): void {
    if (!initialResidentNamesById[enemy.id]) {
        return;
    }

    defeatedInitialResidentIds.add(enemy.id);

    if (defeatedBothResidentsAnnounced) {
        return;
    }

    const defeatedNames = Object.keys(initialResidentNamesById)
        .filter((id) => defeatedInitialResidentIds.has(id))
        .map((id) => initialResidentNamesById[id]);

    if (defeatedNames.length === 2) {
        console.log(`you have defeated ${defeatedNames[0]} and ${defeatedNames[1]}`);
        defeatedBothResidentsAnnounced = true;
    }
}

function resetResidentDefeatTracking(): void {
    for (const id of Object.keys(initialResidentNamesById)) {
        delete initialResidentNamesById[id];
    }

    defeatedInitialResidentIds.clear();
    defeatedBothResidentsAnnounced = false;
}

function grantSharedPartyExperience(totalExp: number): Array<{ name: string; exp: number; levels: number }> {
    const members = player.team.getAll();
    if (members.length === 0 || totalExp <= 0) {
        return [];
    }

    const baseExp = Math.floor(totalExp / members.length);
    let remainder = totalExp % members.length;
    const rewardSummary: Array<{ name: string; exp: number; levels: number }> = [];

    for (const member of members) {
        const reward = baseExp + (remainder > 0 ? 1 : 0);
        if (remainder > 0) {
            remainder -= 1;
        }

        const levels = member.experience.gain(reward);
        rewardSummary.push({
            name: member.name,
            exp: reward,
            levels,
        });
    }

    return rewardSummary;
}

async function confirmAction(title: string, yesLabel: string, noLabel: string): Promise<boolean> {
    const index = await menu.selectMenuOption(title, [
        { label: yesLabel, execute: async () => true },
        { label: noLabel, execute: async () => true },
    ]);

    return index === 0;
}

main().catch((error) => {
    menu.cleanupInput();
    console.error(error);
    process.exit(1);
});
