import maleNames from './constants/names/male.json';
import femaleNames from './constants/names/female.json';
import surnames from './constants/names/surname.json';

// Name generation for El Fergel. The lists are the JSON files in
// constants/names; the random source is injected so names stay
// deterministic in tests.

function pick(list: string[], random: () => number): string {
    return list[Math.floor(random() * list.length)];
}

export function capitalizeName(name: string): string {
    const lower = name.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function randomGivenName(gender: 'male' | 'female', random: () => number): string {
    return capitalizeName(pick(gender === 'male' ? maleNames : femaleNames, random));
}

export function randomSurname(random: () => number): string {
    return capitalizeName(pick(surnames, random));
}

export function randomFarmerName(gender: 'male' | 'female', random: () => number): string {
    return `${randomGivenName(gender, random)} ${randomSurname(random)}`;
}

function hashString(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A stable random name for a character id: the same id always produces
 * the same name, so NPCs keep their names across saves and reloads.
 */
export function farmerNameFor(id: string, gender: 'male' | 'female'): string {
    return randomFarmerName(gender, seededRandom(hashString(id)));
}
