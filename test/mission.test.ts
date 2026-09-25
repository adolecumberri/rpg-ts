import { Character, Stats } from '../src';
import { Hunt } from '../worldTest/core/events/hunt';
import { MissionRunner } from '../worldTest/core/missions/mission';
import type { Mission } from '../worldTest/core/missions/mission';
import { MissionManager } from '../worldTest/core/missions/missionManager';
import { WorldSession } from '../worldTest/core/session';
import { buildHero } from '../worldTest/core/config/characters';

function cowMission(): Mission {
    return {
        id: 'cow_hunt',
        title: 'The Runaway Cow',
        steps: [
            {
                id: 'intro',
                kind: 'dialogue',
                lines: [
                    { speaker: 'Lord', text: 'A cow has run away to the forest.' },
                    { speaker: 'Lord', text: 'Bring it back.' },
                ],
            },
            { id: 'go_forest', kind: 'travel', placeId: 'forest' },
            {
                id: 'search',
                kind: 'hunt',
                foundEncounterId: 'cow',
                hunt: new Hunt([
                    { id: 'goblins', label: 'Goblins', chancePercent: 17, minCount: 1, maxCount: 3 },
                    { id: 'wolf', label: 'Wolf', chancePercent: 2 },
                    { id: 'cow', label: 'Cow', chancePercent: 5, growPercent: 5 },
                ], () => 0.5),
                lines: [{ speaker: 'Arturo', text: 'Let us search the forest.' }],
            },
            {
                id: 'ent',
                kind: 'dialogue',
                lines: [{ speaker: 'Arturo', text: 'The cow is close to an Ent!' }],
            },
            {
                id: 'ent_fight',
                kind: 'wait_battle',
                completeOn: ['fled'],
                lines: [{ speaker: 'Arturo', text: 'Run!' }],
            },
            {
                id: 'reward',
                kind: 'reward',
                flags: ['cow_saved'],
                markerPlaceId: 'central_town',
                lines: [{ speaker: 'Arturo', text: 'We made it.' }],
            },
        ],
    };
}

function script(values: number[]): () => number {
    let index = 0;
    return () => values[index++] ?? 0.99;
}

describe('mission runner', () => {
    it('walks the cow mission step by step', () => {
        // 3 rolls per iteration (goblins, wolf, cow) + count roll on hit.
        const runner = new MissionRunner(cowMission(), {
            random: script([0.1, 0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.14]),
        });

        // intro dialogue
        expect(runner.current()?.kind).toBe('dialogue');
        expect(runner.dialogueLine()?.text).toBe('A cow has run away to the forest.');
        runner.advanceDialogue();
        expect(runner.dialogueLine()?.text).toBe('Bring it back.');
        runner.advanceDialogue();

        // travel step: only the right place completes it
        expect(runner.current()?.kind).toBe('travel');
        runner.reportArrival('central_town');
        expect(runner.current()?.kind).toBe('travel');
        runner.reportArrival('forest');

        // hunt: goblins first, keep hunting
        expect(runner.current()?.kind).toBe('hunt');
        expect(runner.iterateHunt()).toEqual({ kind: 'hit', encounterId: 'goblins', count: 1 });
        runner.reportBattle('won'); // the goblin fight: hunt continues
        expect(runner.current()?.kind).toBe('hunt');

        // nothing, then the cow completes the hunt step
        expect(runner.iterateHunt()).toEqual({ kind: 'nothing' });
        expect(runner.iterateHunt()).toEqual({ kind: 'hit', encounterId: 'cow', count: 1 });

        // ent dialogue
        expect(runner.current()?.kind).toBe('dialogue');
        expect(runner.dialogueLine()?.text).toBe('The cow is close to an Ent!');
        runner.advanceDialogue();

        // wait for the fled outcome only
        expect(runner.current()?.kind).toBe('wait_battle');
        runner.reportBattle('won');
        expect(runner.current()?.kind).toBe('wait_battle');
        runner.reportBattle('fled');

        // reward applied and the mission is done
        expect(runner.isComplete()).toBe(true);
        expect(runner.flagsTaken()).toEqual(['cow_saved']);
        expect(runner.markers()).toEqual([{ placeId: 'central_town', stepId: 'reward' }]);
    });

    it('snapshots and restores mid-hunt state', () => {
        const runner = new MissionRunner(cowMission(), { random: script([0.1, 0, 0.99, 0.99]) });
        runner.advanceDialogue();
        runner.advanceDialogue();
        runner.reportArrival('forest');
        runner.iterateHunt(); // goblins (iteration 1, cow chance -> 10)
        runner.iterateHunt(); // nothing (iteration 2, cow chance -> 15)

        const restored = MissionRunner.restore(cowMission(), runner.snapshot(), {
            random: script([0.99, 0.99, 0.14]),
        });

        expect(restored.stepIndex()).toBe(runner.stepIndex());
        expect(restored.current()?.kind).toBe('hunt');
        const hunt = (restored.current() as { kind: 'hunt'; hunt: Hunt }).hunt;
        expect(hunt.chanceOf('cow')).toBe(15);
        expect(restored.iterateHunt()).toEqual({ kind: 'hit', encounterId: 'cow', count: 1 });
    });

    it('self-heals a save whose step index no longer exists after content edits', () => {
        const runner = new MissionRunner(cowMission(), { random: () => 0.5 });
        const stale = runner.snapshot();
        stale.stepIndex = 99; // steps were removed from the mission

        const restored = MissionRunner.restore(cowMission(), stale);
        expect(restored.isComplete()).toBe(true);
    });

    it('self-heals a save that lands on a reward step: flags apply and it finishes', () => {
        const runner = new MissionRunner(cowMission(), { random: () => 0.5 });
        const stale = runner.snapshot();
        stale.stepIndex = 5; // the reward step, in this mission's old shape

        const restored = MissionRunner.restore(cowMission(), stale);
        expect(restored.isComplete()).toBe(true);
        expect(restored.flagsTaken()).toEqual(['cow_saved']);
    });

    it('completes a task step only for the matching task', () => {
        const mission: Mission = {
            id: 'wood',
            title: 'Wood',
            steps: [
                { id: 'chop', kind: 'task', taskId: 'chop_wood', placeId: 'farm' },
                { id: 'done', kind: 'reward', flags: ['wood_done'] },
            ],
        };
        const runner = new MissionRunner(mission);

        expect(runner.current()?.kind).toBe('task');
        expect(runner.targetPlaceId()).toBe('farm');

        runner.reportTask('collect_hay'); // wrong task: nothing happens
        expect(runner.current()?.kind).toBe('task');

        runner.reportTask('chop_wood');
        expect(runner.isComplete()).toBe(true);
        expect(runner.flagsTaken()).toEqual(['wood_done']);
    });
});

describe('mission manager', () => {
    it('registers, starts and completes missions', () => {
        const manager = new MissionManager(() => 0.5);
        manager.register(cowMission());
        expect(manager.start('cow_hunt')).toBeDefined();
        expect(manager.isCompleted('cow_hunt')).toBe(false);

        const runner = manager.runner('cow_hunt')!;
        runner.advanceDialogue();
        runner.advanceDialogue();
        runner.reportArrival('forest');

        // random 0.5: nothing until the cow chance grows past 50 (iteration 11)
        let result = runner.iterateHunt();
        for (let index = 0; index < 20 && result?.kind !== 'hit'; index++) {
            result = runner.iterateHunt();
        }
        manager.checkFinished(runner);
        expect(result).toEqual({ kind: 'hit', encounterId: 'cow', count: 1 });
        expect(manager.isCompleted('cow_hunt')).toBe(false); // ent steps remain

        runner.advanceDialogue();
        runner.reportBattle('fled');
        manager.checkFinished(runner);
        expect(manager.isCompleted('cow_hunt')).toBe(true);
    });

    it('fails an accepted mission but never a completed or unknown one', () => {
        const manager = new MissionManager(() => 0.5);
        manager.register(cowMission());

        expect(manager.fail('cow_hunt')).toBe(false); // not accepted
        expect(manager.fail('nope')).toBe(false); // unknown

        manager.start('cow_hunt');
        expect(manager.fail('cow_hunt')).toBe(true);
        // The failure is forgotten: the runner is dropped, so the
        // mission is back on the available board (no failed status).
        expect(manager.runner('cow_hunt')).toBeUndefined();
        expect(manager.isCompleted('cow_hunt')).toBe(false);
        expect(manager.activeMissions()).toEqual([]);

        // retrying starts it fresh
        const retried = manager.start('cow_hunt')!;
        expect(retried.isFailed()).toBe(false);

        // completed missions cannot be failed
        retried.advanceDialogue();
        retried.advanceDialogue();
        retried.reportArrival('forest');
        let result = retried.iterateHunt();
        for (let index = 0; index < 20 && result?.kind !== 'hit'; index++) {
            result = retried.iterateHunt();
        }
        retried.advanceDialogue();
        retried.reportBattle('fled');
        manager.checkFinished(retried);
        expect(retried.isComplete()).toBe(true);
        expect(manager.fail('cow_hunt')).toBe(false);
    });

    it('round-trips mission progress through the session save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(cowMission());
        const runner = session.missions.start('cow_hunt')!;
        runner.advanceDialogue();
        runner.advanceDialogue();
        runner.reportArrival('forest');
        runner.iterateHunt(); // random 0.5 -> nothing

        const restored = WorldSession.fromSave(session.exportSave());
        // Content registers its missions and then loads the progress.
        const data = session.exportSave();
        restored.missions.register(cowMission());
        restored.missions.load(data.missions ?? []);
        const restoredRunner = restored.missions.runner('cow_hunt')!;

        expect(restoredRunner.stepIndex()).toBe(runner.stepIndex());
        expect(restoredRunner.current()?.kind).toBe('hunt');
        expect(restored.missions.completedIds()).toEqual([]);
    });

    it('a fled battle outcome completes the wait step through the session', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        session.missions.register(cowMission());
        const runner = session.missions.start('cow_hunt')!;
        runner.advanceDialogue();
        runner.advanceDialogue();
        runner.reportArrival('forest');
        for (let index = 0; index < 11; index++) runner.iterateHunt(); // cow found by grown chance
        session.missions.checkFinished(runner);
        runner.advanceDialogue();
        expect(runner.current()?.kind).toBe('wait_battle');

        const ent = {
            id: 'ent',
            character: new Character({ id: 'ent', name: 'Ent', stats: new Stats({ hp: 100, totalHp: 100 }) }),
            talk: '',
            xpReward: 0,
            goldReward: 0,
        };
        session.finishCombat('fled', { npc: ent, placeId: 'forest' });

        expect(runner.isComplete()).toBe(true);
        expect(session.missions.isCompleted('cow_hunt')).toBe(true);
        expect(runner.flagsTaken()).toEqual(['cow_saved']);
        expect(runner.markers()).toEqual([{ placeId: 'central_town', stepId: 'reward' }]);
    });
});

describe('unit moves and spawns', () => {
    function reinforcementMission(): Mission {
        return {
            id: 'reinforcements',
            title: 'Reinforcements',
            availableAt: ['farm'],
            unitMoves: [
                { count: 2, group: 'The Farmers', fromPlaceId: 'farm', toPlaceId: 'hay_field' },
            ],
            unitSpawns: [
                {
                    count: 3,
                    placeId: 'hay_field',
                    name: 'Militia',
                    talk: '"Ready."',
                    group: 'Militia',
                    stats: { hp: 20, totalHp: 20, attack: 6, defence: 1, speed: 6 },
                },
            ],
            steps: [
                { id: 'go', kind: 'travel', placeId: 'hay_field' },
                { id: 'done', kind: 'reward', flags: ['reinforced'] },
            ],
        };
    }

    it('moves whole groups and generates units when the mission starts', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(reinforcementMission());

        session.startMission('reinforcements');

        const atHay = session.npcsAt('hay_field').map((npc) => npc.id).sort();
        expect(atHay).toEqual([
            'arturo',
            'farmer_0',
            'reinforcements_unit_0',
            'reinforcements_unit_1',
            'reinforcements_unit_2',
        ].sort());
        const militia = session.findNpc('reinforcements_unit_0')!;
        expect(militia.character.name).toBe('Militia');
        expect(militia.group).toBe('Militia');
        expect(militia.character.getStat('hp')).toBe(20);
    });

    it('sends the moved group home and removes the generated units when cancelled', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(reinforcementMission());
        session.startMission('reinforcements');

        session.cancelMission('reinforcements');

        expect(session.npcsAt('hay_field')).toEqual([]);
        expect(session.npcsAt('farm').map((npc) => npc.id)).toContain('arturo');
        expect(session.npcsAt('farm').map((npc) => npc.id)).toContain('farmer_0');
        expect(session.findNpc('reinforcements_unit_0')).toBeUndefined();
    });

    it('re-generates the units after a save/load while the mission is active', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(reinforcementMission());
        session.startMission('reinforcements');

        // The world rebuilds its people from content on load: generated
        // units must re-appear while the mission is active.
        const data = session.exportSave();
        const restored = WorldSession.fromSave(data);
        restored.missions.register(reinforcementMission());
        restored.missions.load(data.missions ?? []); // reload once the catalog knows it
        restored.ensureMissionUnits();

        expect(restored.findNpc('reinforcements_unit_2')).toBeDefined();
        expect(restored.npcsAt('hay_field')).toHaveLength(5); // 2 farmers + 3 militia
    });
});
