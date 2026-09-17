import { Character, createStats, Stats } from "../../src";
import { NewStatistics } from "../augmentations";


export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(list: T[]): T {
    return list[randomInt(0, list.length - 1)];
}

export function randomName(): string {

    const prefixes = ["Ar", "Bel", "Cor", "Dra", "Ela", "Fen", "Gal", "Ira", "Ka", "Mor", "Nya", "Tor"];
    const suffixes = ["dor", "wen", "rik", "lian", "mar", "thas", "ren", "vok", "riel", "dun", "zar", "fin"];
    return `${pick(prefixes)}${pick(suffixes)}`;
}


export function createCharacter(params?: Partial<Stats>): Character {
    const totalHp = params?.totalHp ?? randomInt(8, 15);
    let s = createStats<NewStatistics>({
        attack: params?.attack ?? randomInt(2, 6),
        defence: params?.defence ?? randomInt(1, 4),
        hp: params?.hp ?? totalHp,
        totalHp: params?.totalHp ?? totalHp,
    });

    return new Character({
        id: crypto.randomUUID(),
        name: randomName(),

        stats: s
    });

}
