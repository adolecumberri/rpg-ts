import { Character } from "./Character";
import { Inventory } from "./Inventory";


type TeamConstructor = {
    id: string;
    members: Character[];
    description?: string;
    name?: string;
    inventory?: Inventory;
}

/**
 * Represents a team of characters with position slots.
 */
class Team {
    members: Map<string, Character> = new Map();
    inventory: Inventory;

    gold: number = 0;

    constructor(params?: TeamConstructor) {
        params?.members.forEach((char) => this.addCharacter(char));

        this.inventory = params?.inventory || new Inventory();

    }

    /**
     * Adds a character to the team.
     * If the ID already exists, it won’t be added again.
     */
    addCharacter(character: Character): void {
        if (this.members.has(character.id)) {
            throw new Error(`Character with id ${character.id} already exists in team.`);
        }
        this.members.set(character.id, character);
    }

    /**
     * Removes a character from the team by ID.
     */
    removeCharacter(id: string): void {
        if (!this.members.has(id)) {
            throw new Error(`Character with id ${id} does not exist in team.`);
        }
        this.members.delete(id);
    }

    /**
     * Returns a character by ID, or undefined if not found.
     */
    getCharacter(id: string): Character | undefined {
        return this.members.get(id);
    }

    /**
     * Returns all current members as an array.
     */
    getAll(): Character[] {
        return Array.from(this.members.values());
    }

    /**
     * Returns a random character from the team.
     */
    getRandomCharacter(): Character | undefined {
        const members = this.getAll();
        if (members.length === 0) return undefined;
        const randomIndex = Math.floor(Math.random() * members.length);
        return members[randomIndex];
    }

    /**
     * Returns how many characters are in the team.
     */
    count(): number {
        return this.members.size;
    }

    /**
     * Clears all members from the team.
     */
    clear(): void {
        this.members.clear();
    }

    /**
     * Returns only alive members.
     */
    getAlive(): Character[] {
        return this.getAll().filter((character) => character.stats.hp > 0 && character.stats.isAlive > 0);
    }

}

export { Team };
