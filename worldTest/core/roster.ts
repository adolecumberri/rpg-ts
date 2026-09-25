import { Character, Team } from '../../src';
import { ROSTER } from './config/roster';

/**
 * The pool of characters the player owns, plus which of them form the
 * active party. Characters stay tracked even when they leave the active
 * party, so missions can grant temporary members (Arturo, the lord's
 * son...) without losing anyone.
 */
export class Roster {
    private pool: Character[] = [];
    // Ordered active party (the order is the party order, e.g. turn order).
    private active: string[] = [];

    all(): Character[] {
        return [...this.pool];
    }

    activeIds(): string[] {
        return [...this.active];
    }

    activeCharacters(): Character[] {
        const byId = new Map(this.pool.map((character) => [character.id, character]));
        return this.active
            .map((id) => byId.get(id))
            .filter((character): character is Character => Boolean(character));
    }

    character(id: string): Character | undefined {
        return this.pool.find((entry) => entry.id === id);
    }

    has(id: string): boolean {
        return this.active.indexOf(id) !== -1 || this.pool.some((entry) => entry.id === id);
    }

    /**
     * Adds a character to the pool. Idempotent: adding the same
     * character twice does nothing. The character joins the active
     * party automatically while there is room.
     */
    add(character: Character): void {
        if (this.pool.some((entry) => entry.id === character.id)) return;
        this.pool.push(character);
        if (this.active.length < ROSTER.maxActiveParty) this.active.push(character.id);
    }

    activate(id: string): boolean {
        if (!this.has(id)) return false;
        if (this.active.length >= ROSTER.maxActiveParty) return false;
        this.active.push(id);
        return true;
    }

    deactivate(id: string): void {
        this.active = this.active.filter((entry) => entry !== id);
    }

    /**
     * Replaces the active party with the given ids, keeping the given
     * order (unknown ids are dropped, extras beyond the max are trimmed).
     */
    setActive(ids: string[]): void {
        const valid: string[] = [];
        for (const id of ids) {
            if (this.has(id) && valid.indexOf(id) === -1) valid.push(id);
        }
        this.active = valid.slice(0, ROSTER.maxActiveParty);
    }

    remove(id: string): void {
        this.pool = this.pool.filter((entry) => entry.id !== id);
        this.active = this.active.filter((entry) => entry !== id);
    }

    /**
     * Restores a saved roster (used by the save system).
     */
    load(characters: Character[], activeIds: string[]): void {
        this.pool = [...characters];
        this.setActive(activeIds);
    }

    /**
     * Rebuilds a Team so it matches the active party.
     */
    rebuildTeam(team: Team): void {
        team.clear();
        for (const character of this.activeCharacters()) {
            team.addCharacter(character);
        }
    }
}
