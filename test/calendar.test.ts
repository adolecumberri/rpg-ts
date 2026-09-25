import { GameCalendar } from '../worldTest/core/calendar';
import { CALENDAR } from '../worldTest/core/config/calendar';
import { WorldSession } from '../worldTest/core/session';
import { winHayFieldBattles } from './support/hayField';

// The sickles mission requires a sickle: grant it before accepting.
function giveSickle(session: WorldSession): void {
    session.team.inventory.addItem(session.itemTable.createItem('sickle'));
}

describe('game calendar', () => {
    it('starts at day 1 of Verdarzo (month 0, primavera)', () => {
        const calendar = new GameCalendar();

        expect(calendar.totalDays()).toBe(0);
        expect(calendar.monthIndex()).toBe(0);
        expect(calendar.monthName()).toBe('Verdarzo');
        expect(calendar.dayOfMonth()).toBe(1);
        expect(calendar.season().name).toBe('Primavera');
    });

    it('advances one day at a time', () => {
        const calendar = new GameCalendar();

        calendar.advance();
        expect(calendar.totalDays()).toBe(1);
        expect(calendar.dayOfMonth()).toBe(2);
        expect(calendar.monthIndex()).toBe(0);
    });

    it('rolls over to the next month after 20 days', () => {
        const calendar = new GameCalendar();

        calendar.skip(19);
        expect(calendar.totalDays()).toBe(19);
        expect(calendar.dayOfMonth()).toBe(20);
        expect(calendar.monthName()).toBe('Verdarzo');

        calendar.advance();
        expect(calendar.dayOfMonth()).toBe(1);
        expect(calendar.monthIndex()).toBe(1);
        expect(calendar.monthName()).toBe('Rojibril');
    });

    it('maps every month index to its season', () => {
        const seasonAt = (month: number) => {
            const calendar = new GameCalendar(month * CALENDAR.daysPerMonth);
            return calendar.season().name;
        };

        expect([0, 1, 2].map(seasonAt)).toEqual(['Primavera', 'Primavera', 'Primavera']);
        expect([3, 4, 5].map(seasonAt)).toEqual(['Verano', 'Verano', 'Verano']);
        expect([6, 7, 8].map(seasonAt)).toEqual(['Otoño', 'Otoño', 'Otoño']);
        expect([9, 10, 11].map(seasonAt)).toEqual(['Invierno', 'Invierno', 'Invierno']);
    });

    it('wraps the year: after Celebrero comes Verdarzo again, days keep counting', () => {
        const calendar = new GameCalendar();

        // 12 months x 20 days = 240 days in a full year.
        calendar.skip(240);
        expect(calendar.totalDays()).toBe(240);
        expect(calendar.monthIndex()).toBe(0);
        expect(calendar.monthName()).toBe('Verdarzo');
        expect(calendar.dayOfMonth()).toBe(1);

        // The last month of the first year is Celebrero (index 11).
        const endOfYear = new GameCalendar(239);
        expect(endOfYear.monthName()).toBe('Celebrero');
        expect(endOfYear.dayOfMonth()).toBe(20);
    });

    it('jumps many days at once and ignores non-positive jumps', () => {
        const calendar = new GameCalendar();

        calendar.skip(45); // 2 months + 5 days
        expect(calendar.totalDays()).toBe(45);
        expect(calendar.monthIndex()).toBe(2); // Rosayo
        expect(calendar.dayOfMonth()).toBe(6);

        calendar.skip(0);
        calendar.skip(-3);
        expect(calendar.totalDays()).toBe(45);
    });

    it('restores the elapsed days from a save value', () => {
        const calendar = new GameCalendar();
        calendar.restore(123);
        expect(calendar.totalDays()).toBe(123);
        expect(calendar.monthIndex()).toBe(6); // Ceniciembre
        expect(calendar.dayOfMonth()).toBe(4);
    });
});

describe('calendar in the session', () => {
    it('passes a day when travelling to another place', () => {
        const session = new WorldSession({ random: () => 0.5 });
        expect(session.calendar.totalDays()).toBe(0);

        giveSickle(session);
        session.startMission('sickles_to_hay'); // accepting is free
        session.travel('hay_field'); // travel day

        expect(session.calendar.totalDays()).toBe(1);
        expect(session.calendar.monthName()).toBe('Verdarzo');
        expect(session.calendar.dayOfMonth()).toBe(2);
    });

    it('does not pass a day when accepting missions', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // Several missions can be picked in a row for free.
        giveSickle(session);
        expect(session.startMission('sickles_to_hay')).toBe(true);
        session.cancelMission('sickles_to_hay');
        expect(session.startMission('sickles_to_hay')).toBe(true);
        expect(session.calendar.totalDays()).toBe(0);

        expect(session.startMission('no_such_mission')).toBe(false); // unknown
        expect(session.calendar.totalDays()).toBe(0);
    });

    it('does not pass a day on a blocked travel', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.travel('hay_field').ok).toBe(false); // mission locked
        expect(session.calendar.totalDays()).toBe(0);
    });

    it('round-trips the elapsed days through the save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        giveSickle(session);
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        winHayFieldBattles(session);
        session.travel('farm');
        session.startMission('chop_wood');

        const restored = WorldSession.fromSave(session.exportSave());
        expect(restored.calendar.totalDays()).toBe(session.calendar.totalDays());
        expect(restored.calendar.monthName()).toBe(session.calendar.monthName());
        expect(restored.calendar.dayOfMonth()).toBe(session.calendar.dayOfMonth());
    });

    it('heals saves made before the calendar existed', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const data = session.exportSave();
        delete (data as { calendarDay?: number }).calendarDay;

        const restored = WorldSession.fromSave(data);
        expect(restored.calendar.totalDays()).toBe(0);
    });
});
