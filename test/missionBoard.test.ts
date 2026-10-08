import { WorldSession } from '../worldTest/core/session';
import type { Mission } from '../worldTest/core/missions/mission';
import { MissionManager } from '../worldTest/core/missions/missionManager';
import { CALENDAR } from '../worldTest/core/config/calendar';
import { FLAGS } from '../worldTest/core/constants/flags';

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

function taskMission(): Mission {
    return {
        id: 'wood_run',
        title: 'Wood Run',
        steps: [
            { id: 'gather', kind: 'task', taskId: 'test_task', placeId: 'farm' },
            { id: 'done', kind: 'reward', flags: ['wood_run_done'] },
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

describe('mission display conditions', () => {
    it('hides missions whose month condition does not match the calendar', () => {
        let month = 0;
        const manager = new MissionManager(
            () => 0.5,
            undefined,
            () => 0,
            () => month,
        );
        manager.register({
            id: 'seasonal',
            title: 'Seasonal',
            availableMonths: [5, 6, 7],
            steps: [{ id: 'done', kind: 'reward' }],
        });

        expect(manager.availableMissions()).toEqual([]); // month 0

        month = 6;
        expect(manager.availableMissions().map((mission) => mission.id)).toEqual(['seasonal']);
    });

    it('keeps every available mission in Nuevas (reviewing does not move them)', () => {
        const manager = new MissionManager(() => 0.5, undefined, () => 0, () => 0);
        manager.register({
            id: 'fresh',
            title: 'Fresh',
            steps: [{ id: 'done', kind: 'reward' }],
        });

        // Nuevas holds every mission currently available; nothing else
        // is shown anywhere.
        expect(manager.newMissions().map((mission) => mission.id)).toEqual(['fresh']);
        expect(manager.otherMissions()).toEqual([]);
    });

    it('lists out-of-season missions in Otras with the days left until they return', () => {
        let day = 0;
        const manager = new MissionManager(
            () => 0.5,
            undefined,
            () => day,
            () => Math.floor(day / CALENDAR.daysPerMonth) % CALENDAR.months.length,
        );
        manager.register({
            id: 'seasonal',
            title: 'Seasonal',
            availableMonths: [6, 7, 8],
            steps: [{ id: 'done', kind: 'reward' }],
        });

        // Day 0 (primavera): not acceptable yet, the autumn months
        // start on day 6 × 20 = 120.
        expect(manager.newMissions()).toEqual([]);
        expect(manager.otherMissions().map((mission) => mission.id)).toEqual(['seasonal']);
        expect(manager.daysUntilAvailable('seasonal')).toBe(6 * CALENDAR.daysPerMonth);

        // Late verano: five days left.
        day = 115;
        expect(manager.daysUntilAvailable('seasonal')).toBe(5);

        // In season the mission leaves Otras for Nuevas.
        day = 130;
        expect(manager.otherMissions()).toEqual([]);
        expect(manager.newMissions().map((mission) => mission.id)).toEqual(['seasonal']);
    });
});

describe('mission board', () => {
    it('offers the seasonal encargo and the free test mission first', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // Month 0 is primavera: the spring encargo is in season and the
        // test mission is always open.
        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual([
            'spring_sowing', 'test_mission',
        ]);
        expect(session.hasFlag('east_field_unlocked')).toBe(false);
    });

    it('shows the out-of-season encargos in Otras and refuses to accept them', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // Month 0 is primavera: the summer and autumn encargos wait in
        // Otras with their countdowns, and the gate refuses them.
        expect(session.missions.otherMissions('farm').map((mission) => mission.id)).toEqual([
            'summer_fishing', 'autumn_harvest',
        ]);
        expect(session.missions.daysUntilAvailable('summer_fishing')).toBe(3 * CALENDAR.daysPerMonth);
        expect(session.missions.daysUntilAvailable('autumn_harvest')).toBe(6 * CALENDAR.daysPerMonth);

        for (const mission of session.missions.otherMissions('farm')) {
            expect(session.missionAcceptGate(mission.id).ok).toBe(false);
        }
        expect(session.startMission('summer_fishing')).toBe(false);
        expect(session.missions.activeMissions()).toEqual([]);
    });

    it('removes an accepted mission from the available list', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.start('test_mission');

        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual([
            'spring_sowing',
        ]);
        expect(session.missions.activeMissions().map((runner) => runner.missionId())).toEqual([
            'test_mission',
        ]);
    });

    it('cancelling a mission returns it to the board and closes its route again', () => {
        const session = new WorldSession({ random: () => 0.5 });

        session.startMission('test_mission');
        expect(session.missions.activeMissions()).toHaveLength(1);

        expect(session.cancelMission('test_mission')).toBe(true);
        expect(session.missions.activeMissions()).toEqual([]);
        // The mission returns to the board.
        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual([
            'spring_sowing', 'test_mission',
        ]);

        expect(session.cancelMission('test_mission')).toBe(false); // not accepted anymore
        expect(session.cancelMission('no_such_mission')).toBe(false); // never accepted
    });

    it('walks a travel mission to completion', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const runner = session.missions.start('test_mission')!;
        expect(runner.acceptedBy()).toBe('player');

        // The first step is the travel to the camp.
        expect(runner.current()?.kind).toBe('travel');
        expect(session.activeMissionsAt('camp').map((mission) => mission.missionId)).toEqual([
            'test_mission',
        ]);

        // Arriving completes the travel step into the reward step.
        const arrival = session.travel('camp');
        expect(arrival.ok).toBe(true);
        expect(runner.isComplete()).toBe(true);
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

    it('completes a task mission by doing its task', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(taskMission());

        const runner = session.missions.start('wood_run')!;
        expect(runner.current()?.kind).toBe('task');
        expect(session.activeMissionsAt('farm').map((mission) => mission.missionId)).toEqual(['wood_run']);

        const result = session.doTask({ id: 'test_task', itemId: 'wood', quantity: 1 });
        expect(result.ok).toBe(true);
        expect(result.message).toBe('You gathered 1 Wood. Mission complete: Wood Run');
        expect(runner.isComplete()).toBe(true);
        expect(session.hasFlag('wood_run_done')).toBe(true);
    });

    it('does not complete a task mission from a different task', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(taskMission());
        const runner = session.missions.start('wood_run')!;

        const result = session.doTask({ id: 'other_task', itemId: 'hay', quantity: 1 });
        expect(result.ok).toBe(true);
        expect(result.message).toBe('You gathered 1 Hay.'); // no mission text
        expect(runner.isComplete()).toBe(false);
        expect(session.hasFlag('wood_run_done')).toBe(false);
    });

    it('travel whitelists still lock routes for missions that declare them', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.unlocked.add(FLAGS.HAY_FIELD_UNLOCKED);
        session.missions.register(lockedRouteMission());
        const runner = session.missions.start('locked_route')!;

        expect(session.travel('farm').ok).toBe(false); // not in the route
        expect(session.travel('hay_field').ok).toBe(true);
        expect(runner.isComplete()).toBe(true); // arrival -> reward -> done
    });

    it('exposes the precise game-state queries', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.startMission('test_mission', 'player');

        expect(session.missionIsActive('test_mission')).toBe(true);
        expect(session.missionStepOf('test_mission')?.id).toBe('go');
        expect(session.missionStepOf('winter_stock')).toBeUndefined();
        expect(session.hasFlag('east_field_unlocked')).toBe(false);
        expect(session.missions.runner('test_mission')?.acceptedBy()).toBe('player');
    });
});
