import { StoryEngine, evaluateStoryCondition } from '../worldTest/core/story';
import type {
    ActDefinition,
    StoryCondition,
    StoryContext,
    StoryEffect,
} from '../worldTest/core/story';
import { WorldSession } from '../worldTest/core/session';
import { CHATS } from '../worldTest/core/config/chats';
import type { DialogueLine } from '../worldTest/core/dialogue';
import { FLAGS } from '../worldTest/core/constants/flags';

// ---------------------------------------------------------------------------
// The story event system: conditions, the one-shot engine, and the
// session wiring (flag-gated missions, story effects, hidden places,
// dialogue choice effects and the save round trip).
// ---------------------------------------------------------------------------

function storyContext(
    flags: string[],
    missionState: StoryContext['missionState'] = () => 'none',
    day = 0,
): StoryContext {
    return {
        hasFlag: (flag) => flags.indexOf(flag) !== -1,
        missionState,
        day,
    };
}

function act(
    id: string,
    startWhen: StoryCondition,
    events: ActDefinition['events'] = [],
    onComplete: StoryEffect[] = [],
): ActDefinition {
    return {
        id,
        name: id,
        startWhen,
        completeWhen: { flags: { all: ['NEVER_COMPLETES'] } },
        events,
        onComplete,
    };
}

describe('story conditions', () => {
    it('flags: any, all, or both must hold', () => {
        const ctx = storyContext(['A', 'B']);
        expect(evaluateStoryCondition({ flags: { any: ['A'] } }, ctx)).toBe(true);
        expect(evaluateStoryCondition({ flags: { any: ['Z'] } }, ctx)).toBe(false);
        expect(evaluateStoryCondition({ flags: { all: ['A', 'B'] } }, ctx)).toBe(true);
        expect(evaluateStoryCondition({ flags: { all: ['A', 'Z'] } }, ctx)).toBe(false);
        expect(evaluateStoryCondition({ flags: { any: ['A'], all: ['A', 'B'] } }, ctx)).toBe(true);
        expect(evaluateStoryCondition({ flags: { any: ['Z'], all: ['A'] } }, ctx)).toBe(false);
    });

    it('mission states answer against the live runners', () => {
        const ctx = storyContext([], (id) => (id === 'active' ? 'active' : 'complete'));
        expect(evaluateStoryCondition({ mission: { id: 'active', state: 'active' } }, ctx)).toBe(true);
        expect(evaluateStoryCondition({ mission: { id: 'active', state: 'complete' } }, ctx)).toBe(false);
        expect(evaluateStoryCondition({ mission: { id: 'done', state: 'complete' } }, ctx)).toBe(true);
    });

    it('the day condition passes once the day is over the value', () => {
        expect(evaluateStoryCondition({ day: { over: 2 } }, storyContext([], () => 'none', 3))).toBe(true);
        expect(evaluateStoryCondition({ day: { over: 2 } }, storyContext([], () => 'none', 2))).toBe(false);
    });
});

describe('the story engine', () => {
    function makeEngine(flags: Set<string>) {
        const applied: StoryEffect[] = [];
        const storyEngine = new StoryEngine(
            () => ({
                hasFlag: (flag) => flags.has(flag),
                missionState: () => 'none',
                day: 0,
            }),
            (effect) => {
                // Mirror the session's effect switch for the flag kinds.
                applied.push(effect);
                if (effect.kind === 'setFlag') flags.add(effect.flag);
                if (effect.kind === 'clearFlag') flags.delete(effect.flag);
            },
        );
        return { engine: storyEngine, applied };
    }

    it('arms an act on startWhen and fires each event exactly once', () => {
        const flags = new Set(['START']);
        const { engine, applied } = makeEngine(flags);
        engine.register([act('a', { flags: { all: ['START'] } }, [{
            id: 'e1',
            when: { flags: { all: ['START'] } },
            effects: [{ kind: 'setFlag', flag: 'X' }],
        }])]);

        engine.evaluate();
        expect(applied).toEqual([{ kind: 'setFlag', flag: 'X' }]);

        engine.evaluate(); // one-shot
        expect(applied).toHaveLength(1);
    });

    it('a flag set by one event arms the next in the same pass', () => {
        const flags = new Set(['A']);
        const { engine, applied } = makeEngine(flags);
        engine.register([act('a', { flags: { any: ['A'] } }, [
            { id: 'e1', when: { flags: { any: ['A'] } }, effects: [{ kind: 'setFlag', flag: 'B' }] },
            { id: 'e2', when: { flags: { any: ['B'] } }, effects: [{ kind: 'setFlag', flag: 'C' }] },
        ])]);

        engine.evaluate();
        expect(flags.has('C')).toBe(true);
        expect(applied).toHaveLength(2);
    });

    it('an unarmed act never fires its events', () => {
        const flags = new Set<string>();
        const { engine, applied } = makeEngine(flags);
        engine.register([act('a', { flags: { all: ['START'] } }, [{
            id: 'e1',
            when: { flags: { any: [] } }, // degenerate: always true
            effects: [{ kind: 'setFlag', flag: 'X' }],
        }])]);

        engine.evaluate();
        expect(applied).toEqual([]);
    });

    it('completion wins over events and applies onComplete once', () => {
        const flags = new Set(['START', 'DONE']);
        const { engine, applied } = makeEngine(flags);
        engine.register([{
            id: 'a',
            name: 'A',
            startWhen: { flags: { any: ['START'] } },
            completeWhen: { flags: { all: ['DONE'] } },
            events: [{
                id: 'e1',
                when: { flags: { any: ['START'] } },
                effects: [{ kind: 'setFlag', flag: 'X' }],
            }],
            onComplete: [{ kind: 'setFlag', flag: 'NEXT_ACT' }],
        }]);

        engine.evaluate();
        expect(flags.has('NEXT_ACT')).toBe(true);
        expect(applied).toEqual([{ kind: 'setFlag', flag: 'NEXT_ACT' }]);

        engine.evaluate(); // one-shot
        expect(applied).toHaveLength(1);
    });

    it('round-trips its snapshot', () => {
        const flags = new Set(['START']);
        const { engine, applied } = makeEngine(flags);
        engine.register([act('a', { flags: { all: ['START'] } }, [{
            id: 'e1',
            when: { flags: { all: ['START'] } },
            effects: [{ kind: 'setFlag', flag: 'X' }],
        }])]);
        engine.evaluate();
        expect(applied).toHaveLength(1);

        const snapshot = engine.snapshot();
        const { engine: restored, applied: restoredApplied } = makeEngine(new Set(['START']));
        restored.register([act('a', { flags: { all: ['START'] } }, [{
            id: 'e1',
            when: { flags: { all: ['START'] } },
            effects: [{ kind: 'setFlag', flag: 'X' }],
        }])]);
        restored.restore(snapshot);
        restored.evaluate();
        expect(restoredApplied).toEqual([]); // already applied: no double-fire
    });
});

describe('the story wiring in the session', () => {
    it('a flag from a mission reward triggers the story event that starts the follow-up mission', () => {
        const session = new WorldSession({
            random: () => 0.5,
            acts: [act('act_t', { flags: { any: ['GATE_OPENED'] } }, [{
                id: 'follow_up',
                when: { flags: { any: ['GATE_OPENED'] } },
                effects: [{ kind: 'startMission', missionId: 'follow' }],
            }])],
        });
        session.missions.register({
            id: 'gate_mission',
            title: 'Gate Mission',
            steps: [{ id: 'reward', kind: 'reward', flags: ['GATE_OPENED'] }],
        });
        session.missions.register({
            id: 'follow',
            title: 'Follow Up',
            steps: [{ id: 'wait', kind: 'wait_battle', completeOn: ['won'] }],
        });

        expect(session.startMission('gate_mission')).toBe(true);
        expect(session.hasFlag('GATE_OPENED')).toBe(true);
        expect(session.missionIsActive('follow')).toBe(true);
    });

    it('a mission gated by flags appears on the board once the flags exist', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register({
            id: 'gated',
            title: 'Gated',
            steps: [{ id: 'reward', kind: 'reward' }],
            availableAt: ['farm'],
            requiredFlags: ['GATE'],
        });

        expect(session.missions.newMissions('farm').map((mission) => mission.id)).not.toContain('gated');
        expect(session.missionAcceptGate('gated').ok).toBe(false);

        session.flags.set('GATE');
        expect(session.missions.newMissions('farm').map((mission) => mission.id)).toContain('gated');
        expect(session.missionAcceptGate('gated').ok).toBe(true);
    });

    it('hidePlace removes the place from the map and showPlace brings it back', () => {
        const session = new WorldSession({
            random: () => 0.5,
            acts: [act('act_h', { flags: { any: ['HIDE_FARM'] } }, [
                { id: 'hide_farm', when: { flags: { any: ['HIDE_FARM'] } }, effects: [{ kind: 'hidePlace', placeId: 'farm' }] },
                { id: 'show_farm', when: { flags: { any: ['SHOW_FARM'] } }, effects: [{ kind: 'showPlace', placeId: 'farm' }] },
            ])],
        });
        session.unlocked.add(FLAGS.FARM_UNLOCKED);

        expect(session.travelTargets().find((target) => target.placeId === 'farm')?.hidden).toBe(false);

        session.applyStoryEffect({ kind: 'setFlag', flag: 'HIDE_FARM' });
        const hidden = session.travelTargets().find((target) => target.placeId === 'farm')!;
        expect(hidden.hidden).toBe(true);
        expect(hidden.allowed).toBe(false);
        expect(session.travel('farm').ok).toBe(false);

        session.applyStoryEffect({ kind: 'setFlag', flag: 'SHOW_FARM' });
        expect(session.travelTargets().find((target) => target.placeId === 'farm')?.hidden).toBe(false);
    });

    it('dialogue choice effects set flags and queue fights through the session', () => {
        const session = new WorldSession({ random: () => 0.5 });

        session.applyStoryEffect({ kind: 'setFlag', flag: 'CHOSE_A' });
        expect(session.hasFlag('CHOSE_A')).toBe(true);

        session.applyStoryEffect({ kind: 'startFight', fightId: 'bandits', placeId: 'farm' });
        expect(session.pendingBattle()?.fightId).toBe('bandits');
        expect(session.consumePendingBattle()?.placeId).toBe('farm');
        expect(session.pendingBattle()).toBeNull();
    });

    it('pushed chats hide the lines whose when-condition does not hold', () => {
        (CHATS as Record<string, { id: string; lines: DialogueLine[] }>)['story_test_chat'] = {
            id: 'story_test_chat',
            lines: [
                { speaker: 'A', text: 'always' },
                { speaker: 'B', text: 'gated', when: { flags: { all: ['NEVER'] } } },
            ],
        };
        const session = new WorldSession({
            random: () => 0.5,
            acts: [act('act_c', { flags: { any: ['TRIGGER_CHAT'] } }, [{
                id: 'chat',
                when: { flags: { any: ['TRIGGER_CHAT'] } },
                effects: [{ kind: 'pushChat', chatId: 'story_test_chat' }],
            }])],
        });

        session.applyStoryEffect({ kind: 'setFlag', flag: 'TRIGGER_CHAT' });
        expect(session.messages.remaining()).toBe(1);
        expect(session.messages.peek()?.text).toBe('always');

        delete (CHATS as Record<string, unknown>)['story_test_chat'];
    });

    it('the save round trip keeps applied events from firing twice', () => {
        const session = new WorldSession({
            random: () => 0.5,
            acts: [act('act_s', { flags: { any: ['GO'] } }, [{
                id: 'only_once',
                when: { flags: { any: ['GO'] } },
                effects: [{ kind: 'setFlag', flag: 'RESULT' }],
            }])],
        });
        session.applyStoryEffect({ kind: 'setFlag', flag: 'GO' });
        expect(session.hasFlag('RESULT')).toBe(true);

        const restored = WorldSession.fromSave(session.exportSave());
        restored.flags.remove('RESULT');
        restored.applyStoryEffect({ kind: 'setFlag', flag: 'ANOTHER' });
        expect(restored.hasFlag('RESULT')).toBe(false); // the event stays applied
        expect(restored.hasFlag('ANOTHER')).toBe(true);
    });
});
