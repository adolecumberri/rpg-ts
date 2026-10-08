import { MissionRunner } from './mission';
import type { Mission, MissionSnapshot } from './mission';
import type { BattleOutcome } from './mission';
import { CALENDAR } from '../config/calendar';

// The board-side state of one mission (survives runners: a failed or
// completed runner is dropped, this entry is not).
export type MissionBoardEntry = {
    timesAccepted: number;
    timesCompleted: number;
};

/**
 * Owns the mission catalog and the runners in progress / finished.
 * Systems (travel, combat end) report events here; the runners decide
 * whether any step completes.
 */
export class MissionManager {
    private missions = new Map<string, Mission>();
    private runners = new Map<string, MissionRunner>();
    private completed: string[] = [];
    private random: () => number;
    // Sink for flags taken by reward steps (the session's registry).
    private flagSink?: (flags: string[]) => void;
    // The board-side state per mission (the accept/complete counters).
    private board = new Map<string, MissionBoardEntry>();
    // The story day provider (the session's calendar).
    private dayOfStory: () => number;
    // The current month of the year (0-11): some missions only appear
    // during certain months.
    private monthOfStory: () => number;

    constructor(
        random: () => number = Math.random,
        flagSink?: (flags: string[]) => void,
        dayOfStory: () => number = () => 0,
        monthOfStory: () => number = () => 0,
    ) {
        this.random = random;
        this.flagSink = flagSink;
        this.dayOfStory = dayOfStory;
        this.monthOfStory = monthOfStory;
    }

    register(mission: Mission): void {
        this.missions.set(mission.id, mission);
    }

    registeredIds(): string[] {
        return Array.from(this.missions.keys());
    }

    mission(missionId: string): Mission | undefined {
        return this.missions.get(missionId);
    }

    runner(missionId: string): MissionRunner | undefined {
        return this.runners.get(missionId);
    }

    activeMissions(): MissionRunner[] {
        return Array.from(this.runners.values()).filter(
            (runner) => !runner.isComplete() && !runner.isFailed(),
        );
    }

    completedIds(): string[] {
        return [...this.completed];
    }

    isCompleted(missionId: string): boolean {
        return this.completed.indexOf(missionId) !== -1;
    }

    /**
     * Starts (or restarts) a registered mission, recording which
     * character accepted it and the deadline when the mission declares
     * daysAvailable. Restarting clears a previous failure.
     */
    start(missionId: string, acceptedBy: string = 'player'): MissionRunner | undefined {
        const mission = this.missions.get(missionId);
        if (!mission) return undefined;

        const runner = new MissionRunner(mission, {
            random: this.random,
            acceptedBy,
            onFlagsTaken: this.flagSink,
        });
        if (mission.daysAvailable !== undefined) {
            runner.deadlineDay = this.dayOfStory() + mission.daysAvailable;
        }
        this.runners.set(missionId, runner);
        this.completed = this.completed.filter((id) => id !== missionId);
        const entry = this.boardEntry(missionId);
        entry.timesAccepted += 1;
        return runner;
    }

    /**
     * Cancels an accepted (not completed) mission: it leaves the
     * player's missions and returns to the available board.
     */
    cancel(missionId: string): boolean {
        const runner = this.runners.get(missionId);
        if (!runner || runner.isComplete() || runner.isFailed()) return false;
        this.runners.delete(missionId);
        return true;
    }

    /**
     * Fails an accepted mission: fleeing or losing its battle. The
     * failure is terminal for the current attempt, but the mission
     * itself returns to the available board, so the runner is dropped.
     */
    fail(missionId: string): boolean {
        const runner = this.runners.get(missionId);
        if (!runner || runner.isComplete() || runner.isFailed()) return false;
        runner.fail();
        this.runners.delete(missionId);
        return true;
    }

    /**
     * A failed mission returns to the available board: the failed
     * runner is dropped, exactly like a cancelled mission. Called by
     * the session once it has handled the failure (people moved back,
     * the failure message built from the runner).
     */
    forgetFailure(missionId: string): void {
        const runner = this.runners.get(missionId);
        if (runner && runner.isFailed()) this.runners.delete(missionId);
    }

    /**
     * Reports a travel arrival to every active runner. Returns the ids
     * of the missions this arrival just completed, so the session can
     * tell the player.
     */
    reportArrival(placeId: string): string[] {
        return this.reportAll((runner) => runner.reportArrival(placeId));
    }

    /**
     * Reports a performed place task to every active runner. Returns
     * the ids of the missions the task just completed.
     */
    reportTask(taskId: string): string[] {
        return this.reportAll((runner) => runner.reportTask(taskId));
    }

    /** Reports a battle outcome to every active runner. */
    reportBattle(outcome: BattleOutcome): string[] {
        return this.reportAll((runner) => runner.reportBattle(outcome));
    }

    /** Runs one report against every active runner, tracking new completions. */
    private reportAll(report: (runner: MissionRunner) => void): string[] {
        const justCompleted: string[] = [];
        for (const runner of this.runners.values()) {
            if (runner.isComplete() || runner.isFailed()) continue;
            report(runner);
            this.checkFinished(runner);
            if (runner.isComplete() && justCompleted.indexOf(runner.missionId()) === -1) {
                justCompleted.push(runner.missionId());
            }
        }
        return justCompleted;
    }

    /** Markers ("mission here") placed on a place by completed steps. */
    markersAt(placeId: string): { missionId: string; stepId: string }[] {
        const markers: { missionId: string; stepId: string }[] = [];
        for (const runner of this.runners.values()) {
            for (const marker of runner.markers()) {
                if (marker.placeId === placeId) {
                    markers.push({ missionId: runner.missionId(), stepId: marker.stepId });
                }
            }
        }
        return markers;
    }

    /**
     * Active missions whose current step happens in the place (drives
     * the map's exclamation markers).
     */
    activeAt(placeId: string): { missionId: string; title: string }[] {
        const found: { missionId: string; title: string }[] = [];
        for (const runner of this.runners.values()) {
            if (runner.isComplete()) continue;
            if (runner.targetPlaceId() === placeId) {
                found.push({ missionId: runner.missionId(), title: runner.title() });
            }
        }
        return found;
    }

    /**
     * The missions currently offered on a board. Availability is a live
     * query (the session asks on every arrival, so a move re-evaluates
     * it for the new place): the mission must not be accepted or
     * completed, its requirements must be met, and when it declares
     * places it is only displayed on their boards. Repeatable missions
     * reappear once completed.
     */
    availableMissions(placeId?: string): Mission[] {
        const available: Mission[] = [];
        for (const mission of this.missions.values()) {
            if (mission.hidden) continue; // parked content
            if (!this.monthAllows(mission)) continue; // not the season
            const entry = this.boardEntry(mission.id);
            const repeatable = Boolean(mission.repeatable);
            const accepted = this.runners.has(mission.id);
            const completedBefore = this.completed.indexOf(mission.id) !== -1;
            if (accepted) continue;
            if (completedBefore && !repeatable) continue;
            const requires = mission.requires ?? [];
            const met = requires.every((id) => this.completed.indexOf(id) !== -1);
            if (!met) continue;
            if (placeId && mission.availableAt && mission.availableAt.indexOf(placeId) === -1) continue;
            available.push(mission);
        }
        return available;
    }

    /** Whether the mission's time-of-year condition allows it now. */
    private monthAllows(mission: Mission): boolean {
        if (!mission.availableMonths) return true;
        return mission.availableMonths.indexOf(this.monthOfStory()) !== -1;
    }

    /** The board entry of a mission (created on first query). */
    boardEntry(missionId: string): MissionBoardEntry {
        let entry = this.board.get(missionId);
        if (!entry) {
            entry = {
                timesAccepted: 0,
                timesCompleted: 0,
            };
            this.board.set(missionId, entry);
        }
        return entry;
    }

    /**
     * The Nuevas tab: every mission currently available on the board
     * (in season, requirements met, not accepted or completed).
     */
    newMissions(placeId?: string): Mission[] {
        return this.availableMissions(placeId);
    }

    /**
     * The Otras tab: the known seasonal missions that are OUT of
     * season right now. They cannot be accepted (the accept gate
     * refuses them); the Days column shows the countdown to their
     * next available month.
     */
    otherMissions(placeId?: string): Mission[] {
        return Array.from(this.missions.values()).filter((mission) => {
            if (mission.hidden) return false;
            if (!mission.availableMonths) return false; // only seasonal content
            if (this.monthAllows(mission)) return false; // in season: Nuevas
            if (this.runners.has(mission.id)) return false;
            const completedBefore = this.completed.indexOf(mission.id) !== -1;
            if (completedBefore && !mission.repeatable) return false;
            const requires = mission.requires ?? [];
            if (!requires.every((id) => this.completed.indexOf(id) !== -1)) return false;
            if (placeId && mission.availableAt && mission.availableAt.indexOf(placeId) === -1) return false;
            return true;
        });
    }

    /**
     * Days until the mission becomes available again: the countdown to
     * the start of its next in-season month (the Otras Days cell).
     * Undefined for missions without a time-of-year window.
     */
    daysUntilAvailable(missionId: string): number | undefined {
        const mission = this.missions.get(missionId);
        if (!mission?.availableMonths || mission.availableMonths.length === 0) return undefined;
        const today = this.dayOfStory();
        const daysPerMonth = CALENDAR.daysPerMonth;
        const yearDays = CALENDAR.months.length * daysPerMonth;
        let soonest = Number.POSITIVE_INFINITY;
        for (const month of mission.availableMonths) {
            let start = month * daysPerMonth;
            while (start <= today) start += yearDays;
            if (start < soonest) soonest = start;
        }
        return soonest - today;
    }

    /**
     * The player's owned missions (the Aceptadas tab): the accepted
     * runners still in progress.
     */
    ownedMissions(): MissionRunner[] {
        return this.activeMissions();
    }

    /** How many times the mission has been completed (0 = never). */
    timesCompleted(missionId: string): number {
        return this.board.get(missionId)?.timesCompleted ?? 0;
    }

    /**
     * Passes a story day: every accepted mission whose deadline has
     * passed fails automatically. Returns the failed mission titles.
     */
    onDayPassed(): string[] {
        const today = this.dayOfStory();
        const failed: string[] = [];
        for (const [missionId, runner] of this.runners) {
            if (runner.deadlineDay === undefined) continue;
            if (today <= runner.deadlineDay) continue;
            runner.fail();
            this.runners.delete(missionId);
            failed.push(runner.title());
        }
        return failed;
    }

    /**
     * True when travel to the place is allowed under the current
     * mission state: every active mission with a travel whitelist must
     * allow it.
     */
    travelAllowedTo(placeId: string): boolean {
        const whitelists: string[][] = [];
        for (const runner of this.runners.values()) {
            if (runner.isComplete()) continue;
            const whitelist = runner.travelWhitelist();
            if (whitelist) whitelists.push(whitelist);
        }
        if (whitelists.length === 0) return true;
        for (const whitelist of whitelists) {
            if (whitelist.indexOf(placeId) === -1) return false;
        }
        return true;
    }

    /** Every flag taken by any mission (content queries these). */
    allFlags(): string[] {
        const flags: string[] = [];
        for (const runner of this.runners.values()) {
            for (const flag of runner.flagsTaken()) {
                if (flags.indexOf(flag) === -1) flags.push(flag);
            }
        }
        return flags;
    }

    /** Called after hunt iterations so completions are tracked. */
    checkFinished(runner: MissionRunner): void {
        if (runner.isComplete() && this.completed.indexOf(runner.missionId()) === -1) {
            this.completed.push(runner.missionId());
            const entry = this.boardEntry(runner.missionId());
            entry.timesCompleted += 1;
        }
    }

    serialize(): MissionSnapshot[] {
        return Array.from(this.runners.values()).map((runner) => runner.snapshot());
    }

    /** The board-side state as save entries. */
    serializeBoard(): Array<MissionBoardEntry & { missionId: string }> {
        return Array.from(this.board.entries()).map(([missionId, entry]) => ({
            missionId,
            ...entry,
        }));
    }

    loadBoard(entries: Array<Partial<MissionBoardEntry> & { missionId: string }>): void {
        this.board.clear();
        for (const entry of entries) {
            this.board.set(entry.missionId, {
                timesAccepted: entry.timesAccepted ?? 0,
                timesCompleted: entry.timesCompleted ?? 0,
            });
        }
    }

    load(snapshots: MissionSnapshot[]): void {
        this.runners.clear();
        this.completed = [];
        for (const snapshot of snapshots) {
            const mission = this.missions.get(snapshot.missionId);
            if (!mission) continue;
            // Failed missions are back on the available board: their
            // snapshots are dropped (self-heals saves made while the
            // failed status still existed).
            if (snapshot.failed) continue;
            this.runners.set(snapshot.missionId, MissionRunner.restore(mission, snapshot, { random: this.random }));
            if (snapshot.finished) this.completed.push(snapshot.missionId);
        }
    }
}
