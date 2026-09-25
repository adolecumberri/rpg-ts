import { Dialogue } from '../dialogue';
import type { DialogueLine } from '../dialogue';
import { Hunt } from '../events/hunt';
import type { HuntResult } from '../events/hunt';
import type { NPCStats } from '../types';

// How a battle can end. Missions wait for these outcomes ('died' is
// reserved for the future hardcore mode; 'lost' covers it for now).
export type BattleOutcome = 'won' | 'lost' | 'fled' | 'died';

// A story battle tied to a mission step: the fight that starts (or, for
// dialogue steps, the fight that starts once the lines are read).
export type BattleRef = { fightId: string; placeId: string };

// "Move X units from Y to Z": when the mission is accepted, the first
// `count` people of the group standing at fromPlaceId travel to
// toPlaceId (and return when the mission ends).
export type MissionUnitMove = {
    count: number;
    fromPlaceId: string;
    toPlaceId: string;
    // Only people of this group move (e.g. 'The Farmers').
    group?: string;
};

// "Generate X units in Y place": when the mission is accepted, `count`
// new people appear at placeId (and leave when the mission ends).
export type MissionUnitSpawn = {
    count: number;
    placeId: string;
    name: string;
    talk: string;
    group?: string;
    stats: NPCStats;
};

export type MissionStep =
    | { id: string; kind: 'dialogue'; lines: DialogueLine[]; battle?: BattleRef }
    | {
        id: string;
        kind: 'travel';
        placeId: string;
        // While this step is current, travel is only allowed to these
        // places (the "map" opens restricted to the mission route).
        allowTravelTo?: string[];
        lines?: DialogueLine[];
    }
    | {
        id: string;
        kind: 'hunt';
        hunt: Hunt;
        // The encounter that finishes the hunt (the cow).
        foundEncounterId: string;
        // The place the hunt happens in (drives the map marker).
        placeId?: string;
        lines?: DialogueLine[];
    }
    | {
        id: string;
        kind: 'task';
        // The place task (chop wood, collect hay...) that completes
        // this step when the player performs it.
        taskId: string;
        // Where the task happens (drives the map marker).
        placeId: string;
        lines?: DialogueLine[];
    }
    | {
        id: string;
        kind: 'wait_battle';
        completeOn: BattleOutcome[];
        lines?: DialogueLine[];
        // The battle this step waits for (arrival events gate on it).
        battle?: BattleRef;
    }
    | { id: string; kind: 'reward'; flags?: string[]; markerPlaceId?: string; lines?: DialogueLine[] };

export type Mission = {
    id: string;
    title: string;
    // Shown on the mission detail screen before the steps play.
    description?: string;
    steps: MissionStep[];
    // Mission ids that must be completed before this one is offered on
    // the board (the hall unlocks missions in order).
    requires?: string[];
    // The places whose board offers this mission. Undefined = offered
    // everywhere (a board in another city does not show farm missions).
    availableAt?: string[];
    // People that travel with the mission: when accepted the npcs move
    // to the target place (and move back when the mission is cancelled).
    npcMoves?: { npcId: string; fromPlaceId: string; toPlaceId: string }[];
    // Group-level movements: move N people of a group between places
    // while the mission runs (they return when it ends).
    unitMoves?: MissionUnitMove[];
    // Generated people: N new units appear at a place while the mission
    // runs (they leave when it ends).
    unitSpawns?: MissionUnitSpawn[];
    // What the player must own to accept the mission: gold and/or items.
    requirements?: {
        gold?: number;
        items?: { itemId: string; quantity: number }[];
    };
};

// Save shape of a mission in progress / finished / failed.
export type MissionSnapshot = {
    missionId: string;
    stepIndex: number;
    completedSteps: string[];
    huntStates: {
        stepId: string;
        iterations: number;
        chances: { encounterId: string; chancePercent: number }[];
    }[];
    flags: string[];
    markers: { placeId: string; stepId: string }[];
    finished: boolean;
    failed: boolean;
};

/**
 * The state machine of one mission. Each step kind completes through a
 * different external event, so the runner never knows about the UI or
 * the combat: systems report events into it.
 */
export class MissionRunner {
    private mission: Mission;
    private steps: MissionStep[];
    private index = 0;
    private completedSteps: string[] = [];
    private dialogue: Dialogue | null = null;
    private finished = false;
    private failed = false;
    private flags: string[] = [];
    private markerList: { placeId: string; stepId: string }[] = [];
    private random: () => number;
    // The character that accepted the mission (the user's party member).
    private acceptedByCharacter: string;
    // Called when a reward step takes flags, so the session's registry
    // (the story memory) learns about them.
    private onFlagsTaken?: (flags: string[]) => void;

    constructor(
        mission: Mission,
        options: {
            random?: () => number;
            skipEntry?: boolean;
            acceptedBy?: string;
            onFlagsTaken?: (flags: string[]) => void;
        } = {},
    ) {
        this.mission = mission;
        this.random = options.random ?? Math.random;
        this.acceptedByCharacter = options.acceptedBy ?? 'player';
        this.onFlagsTaken = options.onFlagsTaken;
        this.steps = mission.steps.map((step) =>
            step.kind === 'hunt'
                ? { ...step, hunt: new Hunt(step.hunt.encountersOf(), this.random) }
                : { ...step },
        );
        if (!options.skipEntry) this.enter(this.current());
    }

    missionId(): string {
        return this.mission.id;
    }

    title(): string {
        return this.mission.title;
    }

    description(): string | undefined {
        return this.mission.description;
    }

    acceptedBy(): string {
        return this.acceptedByCharacter;
    }

    current(): MissionStep | undefined {
        if (this.finished || this.failed) return undefined;
        return this.steps[this.index];
    }

    currentStepId(): string | undefined {
        return this.current()?.id;
    }

    /**
     * The places travel is allowed to while the current step is active
     * (undefined = no restriction from this mission).
     */
    travelWhitelist(): string[] | undefined {
        const step = this.current();
        if (!step || this.finished || this.failed) return undefined;
        return step.kind === 'travel' ? step.allowTravelTo : undefined;
    }

    /**
     * The place where the current step happens (drives the map's
     * exclamation markers). Undefined when the step has no place.
     */
    targetPlaceId(): string | undefined {
        const step = this.current();
        if (!step || this.finished || this.failed) return undefined;
        if (step.kind === 'travel') return step.placeId;
        if (step.kind === 'hunt') return step.placeId;
        if (step.kind === 'task') return step.placeId;
        return undefined;
    }

    stepIndex(): number {
        return this.index;
    }

    isComplete(): boolean {
        return this.finished;
    }

    /** True when the mission failed (fled/lost battle, cancelled). */
    isFailed(): boolean {
        return this.failed;
    }

    /** Fails the mission: terminal, like completing it, without rewards. */
    fail(): void {
        if (this.finished || this.failed) return;
        this.failed = true;
        this.dialogue = null;
    }

    completedStepsOf(): string[] {
        return [...this.completedSteps];
    }

    flagsTaken(): string[] {
        return [...this.flags];
    }

    markers(): { placeId: string; stepId: string }[] {
        return [...this.markerList];
    }

    /** The phrase currently on screen (null when the step has no dialogue). */
    dialogueLine(): DialogueLine | null {
        return this.dialogue?.current() ?? null;
    }

    /** Advances the dialogue; finishing the lines completes the step. */
    advanceDialogue(): void {
        const step = this.current();
        if (!step || !this.dialogue) return;
        const line = this.dialogue.advance();
        if (!line) {
            this.dialogue = null;
            this.completeStep(step.id);
        }
    }

    /** Reports a travel arrival; completes a matching travel step. */
    reportArrival(placeId: string): void {
        const step = this.current();
        if (step?.kind === 'travel' && step.placeId === placeId) {
            this.completeStep(step.id);
        }
    }

    /** Reports a performed place task; completes a matching task step. */
    reportTask(taskId: string): void {
        const step = this.current();
        if (step?.kind === 'task' && step.taskId === taskId) {
            this.completeStep(step.id);
        }
    }

    /**
     * One hunt iteration. Returns null when the current step is not a
     * hunt. Hitting the found encounter completes the step.
     */
    iterateHunt(): HuntResult | null {
        const step = this.current();
        if (step?.kind !== 'hunt') return null;

        const result = step.hunt.iterate();
        if (result.kind === 'hit' && result.encounterId === step.foundEncounterId) {
            this.completeStep(step.id);
        }
        return result;
    }

    /** Reports a battle outcome; completes a matching wait_battle step. */
    reportBattle(outcome: BattleOutcome): void {
        const step = this.current();
        if (step?.kind === 'wait_battle' && step.completeOn.indexOf(outcome) !== -1) {
            this.completeStep(step.id);
        }
    }

    snapshot(): MissionSnapshot {
        const huntStates: MissionSnapshot['huntStates'] = [];
        for (const step of this.steps) {
            if (step.kind !== 'hunt') continue;
            huntStates.push({
                stepId: step.id,
                iterations: step.hunt.iterationsDone(),
                chances: step.hunt.encountersOf().map((entry) => ({
                    encounterId: entry.id,
                    chancePercent: entry.chancePercent,
                })),
            });
        }

        return {
            missionId: this.mission.id,
            stepIndex: this.index,
            completedSteps: [...this.completedSteps],
            huntStates,
            flags: [...this.flags],
            markers: [...this.markerList],
            finished: this.finished,
            failed: this.failed,
        };
    }

    static restore(mission: Mission, snapshot: MissionSnapshot, options: { random?: () => number } = {}): MissionRunner {
        const runner = new MissionRunner(mission, { random: options.random, skipEntry: true });

        runner.index = snapshot.stepIndex;
        runner.completedSteps = [...snapshot.completedSteps];
        runner.flags = [...snapshot.flags];
        runner.markerList = [...snapshot.markers];
        runner.finished = snapshot.finished;
        runner.failed = snapshot.failed ?? false;

        // A failed mission is terminal: skip the self-heal rewinds.
        if (runner.failed) return runner;

        // Self-heal against content edits: when the saved index no
        // longer exists (steps were removed/shortened), the mission is
        // over; a reward step reached this way applies immediately.
        if (runner.index >= runner.steps.length) {
            runner.finished = true;
        } else if (runner.current()?.kind === 'reward') {
            runner.enter(runner.current()!);
        }

        for (const step of runner.steps) {
            if (step.kind !== 'hunt') continue;
            const state = snapshot.huntStates.find((entry) => entry.stepId === step.id);
            if (state) step.hunt.restoreState(state.iterations, state.chances);
        }

        const current = runner.current();
        if (current?.lines && current.lines.length > 0) {
            runner.dialogue = new Dialogue(current.lines);
        }
        return runner;
    }

    private enter(step: MissionStep | undefined): void {
        if (!step) {
            this.finished = true;
            return;
        }
        this.dialogue = step.lines && step.lines.length > 0 ? new Dialogue(step.lines) : null;

        // Rewards apply when reached and complete immediately.
        if (step.kind === 'reward') {
            if (step.flags) {
                for (const flag of step.flags) {
                    if (this.flags.indexOf(flag) === -1) this.flags.push(flag);
                }
                // The session's flag registry learns about them.
                this.onFlagsTaken?.(step.flags);
            }
            if (step.markerPlaceId) {
                this.markerList.push({ placeId: step.markerPlaceId, stepId: step.id });
            }
            this.completeStep(step.id);
        }
    }

    private completeStep(stepId: string): void {
        if (this.completedSteps.indexOf(stepId) === -1) this.completedSteps.push(stepId);
        this.index++;
        this.enter(this.current());
    }
}
