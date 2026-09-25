import { CALENDAR } from './config/calendar';

export type Season = {
    name: string;
    icon: string;
};

/**
 * The story calendar. Only the total number of elapsed days is stored:
 * month, day-of-month and season derive from it (no year counting).
 * One day passes when the player travels to another place or enters a
 * mission; `skip` jumps any number of days at once.
 */
export class GameCalendar {
    private dayIndex = 0;

    constructor(dayIndex = 0) {
        this.dayIndex = Math.max(0, dayIndex);
    }

    /** Total days the player has been in the story (starts at 0). */
    totalDays(): number {
        return this.dayIndex;
    }

    /** Current month index (0-11). Content gates by this index. */
    monthIndex(): number {
        return Math.floor(this.dayIndex / CALENDAR.daysPerMonth) % CALENDAR.months.length;
    }

    monthName(): string {
        return CALENDAR.months[this.monthIndex()];
    }

    /** Day of the month, 1 to daysPerMonth. */
    dayOfMonth(): number {
        return (this.dayIndex % CALENDAR.daysPerMonth) + 1;
    }

    season(): Season {
        const month = this.monthIndex();
        const found = CALENDAR.seasons.find((entry) => entry.months.indexOf(month) !== -1);
        return found ?? CALENDAR.seasons[0];
    }

    /** Passes one day. */
    advance(): void {
        this.skip(1);
    }

    /** Jumps X days at once (negative values are ignored). */
    skip(days: number): void {
        if (days <= 0) return;
        this.dayIndex += Math.floor(days);
    }

    /** Restores the elapsed days from a save. */
    restore(dayIndex: number): void {
        this.dayIndex = Math.max(0, dayIndex);
    }
}
