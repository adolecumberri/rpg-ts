import { Character, Stats, Team } from '../src';
import { Roster } from '../worldTest/core/roster';
import { ROSTER } from '../worldTest/core/config/roster';
import { WorldSession } from '../worldTest/core/session';
import { buildHero } from '../worldTest/core/config/characters';

function farmer(id: string): Character {
    return new Character({ id, name: id, stats: new Stats({ hp: 20, totalHp: 20 }) });
}

describe('roster', () => {
    it('activates new characters automatically while there is room', () => {
        const roster = new Roster();
        roster.add(farmer('a'));
        roster.add(farmer('b'));

        expect(roster.activeIds()).toEqual(['a', 'b']);
        expect(roster.all()).toHaveLength(2);
    });

    it('keeps characters beyond the max in the pool but inactive', () => {
        const roster = new Roster();
        for (let index = 0; index < ROSTER.maxActiveParty + 2; index++) {
            roster.add(farmer(`f${index}`));
        }

        expect(roster.activeIds()).toHaveLength(ROSTER.maxActiveParty);
        expect(roster.all()).toHaveLength(ROSTER.maxActiveParty + 2);
    });

    it('is idempotent when adding the same character twice', () => {
        const roster = new Roster();
        const a = farmer('a');
        roster.add(a);
        roster.add(a);

        expect(roster.all()).toHaveLength(1);
    });

    it('setActive replaces the party without touching the pool', () => {
        const roster = new Roster();
        roster.add(farmer('a'));
        roster.add(farmer('b'));
        roster.add(farmer('c'));
        const team = new Team();
        roster.rebuildTeam(team);
        expect(team.getAll().map((character) => character.id)).toEqual(['a', 'b', 'c']);

        roster.setActive(['c', 'a']);
        roster.rebuildTeam(team);

        expect(team.getAll().map((character) => character.id)).toEqual(['c', 'a']);
        expect(roster.all()).toHaveLength(3); // pool untouched
    });

    it('deactivate and remove keep the rest tracked', () => {
        const roster = new Roster();
        roster.add(farmer('a'));
        roster.add(farmer('b'));

        roster.deactivate('a');
        expect(roster.activeIds()).toEqual(['b']);
        expect(roster.has('a')).toBe(true);

        roster.remove('a');
        expect(roster.has('a')).toBe(false);
        expect(roster.activeIds()).toEqual(['b']);
    });

    it('round-trips the roster through the save system with active flags', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.addRosterCharacter(buildHero());
        session.addRosterCharacter(farmer('arturo')); // already owned by act 1: no-op
        session.addRosterCharacter(farmer('f1'));
        session.addRosterCharacter(farmer('f2'));
        session.addRosterCharacter(farmer('f3'));

        // Act 1 owns 13 characters (player + 12 farmers); hero, f1 and f2
        // fill the remaining active slots, f3 waits in the pool.
        expect(session.roster.all()).toHaveLength(17);
        expect(session.roster.activeIds()).toEqual(['player', 'hero', 'f1', 'f2']);

        session.setActiveParty(['hero', 'arturo', 'f3']);
        const restored = WorldSession.fromSave(session.exportSave());

        expect(restored.roster.all()).toHaveLength(17);
        expect(restored.roster.activeIds()).toEqual(['hero', 'arturo', 'f3']);
        expect(restored.team.getAll().map((character) => character.id)).toEqual(['hero', 'arturo', 'f3']);
    });

    it('loads legacy saves (no roster field) with everything active', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.addRosterCharacter(buildHero());

        const data = session.exportSave();
        delete (data as { roster?: unknown }).roster;

        const restored = WorldSession.fromSave(data);

        expect(restored.roster.all().map((character) => character.id)).toEqual(['player', 'hero']);
        expect(restored.roster.activeIds()).toEqual(['player', 'hero']);
        expect(restored.team.getAll().map((character) => character.id)).toEqual(['player', 'hero']);
    });

    it('keeps characters added straight to the team when saving', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());

        const restored = WorldSession.fromSave(session.exportSave());

        expect(restored.roster.all()).toHaveLength(14); // act 1 pool (13) + hero
        expect(restored.roster.activeIds()).toEqual(['player', 'hero']);
        expect(restored.team.getAll().map((character) => character.id)).toEqual(['player', 'hero']);
    });
});
