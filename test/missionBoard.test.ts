import { WorldSession } from '../worldTest/core/session';
import type { Mission } from '../worldTest/core/missions/mission';
import { winHayFieldBattles } from './support/hayField';

// The sickles mission requires a sickle: grant it before accepting.
function giveSickle(session: WorldSession): void {
    session.team.inventory.addItem(session.itemTable.createItem('sickle'));
}

function multiMission(id: string, placeId: string): Mission {
    return {
        id,
        title: `Mission ${id}`,
        steps: [
            { id: 'go', kind: 'travel', placeId },
            { id: 'done', kind: 'reward', flags: [`${id}_done`] },
        ],
    };
}

function lockedRouteMission(): Mission {
    return {
        id: 'locked_route',
        title: 'Locked Route',
        steps: [
            { id: 'go', kind: 'travel', placeId: 'hay_field', allowTravelTo: ['hay_field'] },
            { id: 'done', kind: 'reward', flags: ['locked_done'] },
        ],
    };
}

describe('mission board', () => {
    it('offers the sickles mission first and unlocks chopping wood after it', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual([
            'sickles_to_hay',
        ]);
        expect(session.hasFlag('sickles_delivered')).toBe(false);
        expect(session.missionIsComplete('sickles_to_hay')).toBe(false);
    });

    it('removes an accepted mission from the available list', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.start('sickles_to_hay');

        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual([]);
        expect(session.missions.activeMissions().map((runner) => runner.missionId())).toEqual([
            'sickles_to_hay',
        ]);
    });

    it('cancelling a mission returns it to the board and closes its route again', () => {
        const session = new WorldSession({ random: () => 0.5 });

        giveSickle(session);
        session.startMission('sickles_to_hay');
        expect(session.missions.activeMissions()).toHaveLength(1);

        expect(session.cancelMission('sickles_to_hay')).toBe(true);
        expect(session.missions.activeMissions()).toEqual([]);
        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual([
            'sickles_to_hay',
        ]);
        expect(session.travel('hay_field').ok).toBe(false); // route closed again

        expect(session.cancelMission('sickles_to_hay')).toBe(false); // not accepted anymore
        expect(session.cancelMission('cow_hunt')).toBe(false); // never accepted
    });

    it('offers the missions on the farm board only, in order', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // another place's board shows none of the farm missions
        expect(session.missions.availableMissions('hay_field')).toEqual([]);

        // sickles -> chop wood -> cow, each gated by the previous one
        session.missions.start('sickles_to_hay');
        session.travel('hay_field');
        winHayFieldBattles(session);
        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual(['chop_wood']);

        session.missions.start('chop_wood');
        session.doTask({ id: 'chop_wood', itemId: 'wood', quantity: 1 });
        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual(['cow_hunt']);
    });

    it('walks the sickles mission: three battles, two story beats, then complete', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const runner = session.missions.start('sickles_to_hay')!;
        expect(runner.acceptedBy()).toBe('player');

        // go_hay: the map marks the hay field
        expect(runner.current()?.kind).toBe('travel');
        expect(session.activeMissionsAt('hay_field').map((mission) => mission.missionId)).toEqual([
            'sickles_to_hay',
        ]);
        expect(session.activeMissionsAt('farm')).toEqual([]);

        // arriving: the story lines play, the first goblin battle is
        // queued, and the travel step completes into the wait_battle step
        const arrival = session.travel('hay_field');
        expect(arrival.ok).toBe(true);
        expect(arrival.arrival).toBe(true);
        expect(runner.current()?.id).toBe('fight_one');
        expect(session.messages.peek()?.speaker).toBe('Federico');
        expect(session.pendingBattle()).toEqual({
            fightId: 'hay_goblins',
            placeId: 'hay_field',
            missionId: 'sickles_to_hay',
        });
        session.messages.clear(); // the UI reads the thanks lines before the battle

        // winning the skirmish does NOT end the mission: the rally
        // lines play and the second battle queues.
        const first = session.finishCombat('won', { placeId: 'hay_field', fightId: 'hay_goblins', missionId: 'sickles_to_hay' });
        expect(first.message).toContain('Victory');
        expect(runner.isComplete()).toBe(false);
        expect(runner.current()?.id).toBe('fight_two');
        expect(session.messages.peek()?.text).toContain('More of them are coming');
        expect(session.pendingBattle()).toEqual({
            fightId: 'hay_goblins_2',
            placeId: 'hay_field',
            missionId: 'sickles_to_hay',
        });
        session.messages.clear(); // rally lines read before battle two

        // the united farmers battle: the boss beat follows.
        const second = session.finishCombat('won', { placeId: 'hay_field', fightId: 'hay_goblins_2', missionId: 'sickles_to_hay' });
        expect(second.message).toContain('Victory');
        expect(runner.isComplete()).toBe(false);
        expect(runner.current()?.id).toBe('boss_fight');
        expect(session.messages.peek()?.speaker).toBe('Federico');
        expect(session.pendingBattle()).toEqual({
            fightId: 'hay_boss',
            placeId: 'hay_field',
            missionId: 'sickles_to_hay',
        });

        // the goblin chief falls: the mission completes and reports it
        const end = session.finishCombat('won', { placeId: 'hay_field', fightId: 'hay_boss', missionId: 'sickles_to_hay' });
        expect(end.message).toContain('Mission complete: Sickles to the Hay Field');
        expect(runner.isComplete()).toBe(true);
        expect(session.hasFlag('sickles_delivered')).toBe(true);
        expect(session.missions.availableMissions().map((mission) => mission.id)).toEqual(['chop_wood']);
    });

    it('locks the hay field until the sickles mission is accepted', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // no mission yet: the road to the hay field is closed
        expect(session.travel('hay_field').ok).toBe(false);

        session.missions.start('sickles_to_hay');
        expect(session.travel('hay_field').ok).toBe(true);

        // the way home stays open, and once the mission completes the
        // road out closes again (nothing to do in the hay field)
        winHayFieldBattles(session);
        expect(session.travel('farm').ok).toBe(true);
        expect(session.travel('hay_field').ok).toBe(false);
    });

    it('picks several missions at once and marks all their targets', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(multiMission('m_a', 'farm'));
        session.missions.register(multiMission('m_b', 'farm'));

        session.missions.start('m_a');
        session.missions.start('m_b');

        expect(session.missions.activeMissions()).toHaveLength(2);
        expect(session.activeMissionsAt('farm').map((mission) => mission.missionId)).toEqual(['m_a', 'm_b']);
    });

    it('completes chopping wood by doing the farm task', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // offered only after the sickles mission
        session.missions.start('sickles_to_hay');
        session.travel('hay_field');
        winHayFieldBattles(session);
        expect(session.missions.availableMissions().map((mission) => mission.id)).toEqual(['chop_wood']);

        const runner = session.missions.start('chop_wood')!;
        expect(runner.current()?.kind).toBe('task');
        expect(session.activeMissionsAt('farm').map((mission) => mission.missionId)).toEqual(['chop_wood']);

        // the farm task completes it and the session reports it
        const result = session.doTask({ id: 'chop_wood', itemId: 'wood', quantity: 1 });
        expect(result.ok).toBe(true);
        expect(result.message).toBe('You gathered 1 Wood. Mission complete: Chopping Wood');
        expect(runner.isComplete()).toBe(true);
        expect(session.hasFlag('wood_chopped')).toBe(true);
    });

    it('does not complete the wood mission from a different task', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.start('sickles_to_hay');
        session.travel('hay_field');
        winHayFieldBattles(session);
        const runner = session.missions.start('chop_wood')!;

        const result = session.doTask({ id: 'collect_hay', itemId: 'hay', quantity: 1 });
        expect(result.ok).toBe(true);
        expect(result.message).toBe('You gathered 1 Hay.'); // no mission text
        expect(runner.isComplete()).toBe(false);
        expect(session.hasFlag('wood_chopped')).toBe(false);
    });

    it('travel whitelists still lock routes for missions that declare them', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.start('sickles_to_hay'); // opens the road to the hay field
        session.missions.register(lockedRouteMission());
        const runner = session.missions.start('locked_route')!;

        expect(session.travel('farm').ok).toBe(false); // not in the route
        expect(session.travel('hay_field').ok).toBe(true);
        expect(runner.isComplete()).toBe(true); // arrival -> reward -> done
    });

    it('exposes the precise game-state queries', () => {
        const session = new WorldSession({ random: () => 0.5 });
        giveSickle(session);
        session.startMission('sickles_to_hay', 'player');

        expect(session.missionIsActive('sickles_to_hay')).toBe(true);
        expect(session.missionStepOf('sickles_to_hay')?.id).toBe('go_hay');
        expect(session.missionStepOf('chop_wood')).toBeUndefined();
        expect(session.hasFlag('wood_chopped')).toBe(false);
        expect(session.missions.runner('sickles_to_hay')?.acceptedBy()).toBe('player');
    });
});
