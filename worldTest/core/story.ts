// ---------------------------------------------------------------------------
// The story event system: acts and their beats as pure data. An act
// declares its entry and completion conditions, the events that fire
// along the way, and what happens when it completes. The session runs
// one StoryEngine and re-evaluates it after every change that can move
// the story (travel, mission steps, flag writes, battle ends, day
// passes); events fire once and their effects are data too — setting
// flags, starting missions or fights, moving people, hiding places.
//
// The content vocabulary stays the map + missions + dialogs + flags:
// this file only adds the spine that ties them together.
// ---------------------------------------------------------------------------

// A story condition: "did this happen?" answered against the live
// session (the story memory, the mission states and the calendar).
export type StoryCondition =
    | {
        // Holds when the listed flags exist in the story memory.
        // `any`: at least one; `all`: every one. Both may be set.
        flags: { any?: string[]; all?: string[] };
    }
    | {
        // Holds while the mission is in this state. 'active' = accepted
        // and running; 'complete' = ever completed; 'failed' = the
        // current attempt failed (transient, until it is forgotten).
        mission: { id: string; state: 'active' | 'complete' | 'failed' };
    }
    | {
        // Holds once the story day has passed the value (one day per
        // travel, one per mission).
        day: { over: number };
    };

// A story effect: a declared mutation of the session, not code.
export type StoryEffect =
    | { kind: 'setFlag'; flag: string }
    | { kind: 'clearFlag'; flag: string }
    | { kind: 'pushChat'; chatId: string }
    | { kind: 'startMission'; missionId: string }
    | { kind: 'startFight'; fightId: string; placeId: string; missionId?: string }
    | { kind: 'moveNpc'; npcId: string; toPlaceId: string }
    | { kind: 'showPlace'; placeId: string }
    | { kind: 'hidePlace'; placeId: string }
    // The branch choice: re-jobs a character (bonuses applied, gear the
    // new job cannot wield returns to the inventory) and, when declared,
    // hands over the class weapon directly (created from the catalog,
    // never taken from the shared bag).
    | { kind: 'setJob'; characterId: string; jobId: string; weaponItemId?: string }
    // Completes the mission's current wait_battle step as a retreat
    // (the vote "leave" option: the fight never happens).
    | { kind: 'skipBattle'; missionId: string };

// One story beat: the first time `when` holds, the effects apply and
// the event is done (one-shot; chained flags re-arm further events).
export type StoryEvent = {
    id: string;
    when: StoryCondition;
    effects: StoryEffect[];
};

// An act of the story: the spine between the missions and the world.
export type ActDefinition = {
    id: string;
    name: string;
    // Entry: its events only exist once this holds.
    startWhen: StoryCondition;
    // The act's arc: when this holds the act completes, its events stop
    // and the onComplete effects hand the story to the next act.
    completeWhen: StoryCondition;
    events: StoryEvent[];
    onComplete: StoryEffect[];
};

// What the engine reads to answer a condition.
export type StoryContext = {
    hasFlag: (flag: string) => boolean;
    missionState: (missionId: string) => 'active' | 'complete' | 'failed' | 'none';
    day: number;
};

/** Pure condition evaluation against the live story context. */
export function evaluateStoryCondition(
    condition: StoryCondition,
    context: StoryContext,
): boolean {
    if ('flags' in condition) {
        const any = condition.flags.any ?? [];
        const all = condition.flags.all ?? [];
        if (any.length > 0 && !any.some((flag) => context.hasFlag(flag))) return false;
        if (all.length > 0 && !all.every((flag) => context.hasFlag(flag))) return false;
        return true;
    }
    if ('mission' in condition) {
        return context.missionState(condition.mission.id) === condition.mission.state;
    }
    return context.day > condition.day.over;
}

// The engine's memory, persisted with the save.
export type StorySnapshot = {
    armed: string[];
    completedActs: string[];
    applied: string[];
};

/**
 * Evaluates the registered acts against the live context. Effects are
 * handed to the applier callback (the session's effect switch); an
 * applied effect may itself change the story, so the pass repeats
 * until nothing new fires (flag chains resolve in one call).
 */
export class StoryEngine {
    private acts: ActDefinition[] = [];
    private armed = new Set<string>();
    private completedActs = new Set<string>();
    private applied = new Set<string>();
    private readonly context: () => StoryContext;
    private readonly applyEffect: (effect: StoryEffect) => void;

    constructor(context: () => StoryContext, applyEffect: (effect: StoryEffect) => void) {
        this.context = context;
        this.applyEffect = applyEffect;
    }

    register(acts: ActDefinition[]): void {
        this.acts = [...acts];
    }

    evaluate(): void {
        let changed = true;
        while (changed) {
            changed = false;

            // 1. Entry: an act whose startWhen holds arms its events.
            for (const act of this.acts) {
                if (this.armed.has(act.id)) continue;
                if (!evaluateStoryCondition(act.startWhen, this.context())) continue;
                this.armed.add(act.id);
                changed = true;
            }

            // 2. The armed acts: completion first, then their events.
            for (const act of this.acts) {
                if (!this.armed.has(act.id) || this.completedActs.has(act.id)) continue;

                if (evaluateStoryCondition(act.completeWhen, this.context())) {
                    this.completedActs.add(act.id);
                    for (const effect of act.onComplete) this.applyEffect(effect);
                    changed = true;
                    continue;
                }

                for (const event of act.events) {
                    if (this.applied.has(event.id)) continue;
                    if (!evaluateStoryCondition(event.when, this.context())) continue;
                    this.applied.add(event.id);
                    for (const effect of event.effects) this.applyEffect(effect);
                    changed = true;
                }
            }
        }
    }

    snapshot(): StorySnapshot {
        return {
            armed: Array.from(this.armed),
            completedActs: Array.from(this.completedActs),
            applied: Array.from(this.applied),
        };
    }

    restore(snapshot: StorySnapshot): void {
        this.armed = new Set(snapshot.armed);
        this.completedActs = new Set(snapshot.completedActs);
        this.applied = new Set(snapshot.applied);
    }
}
