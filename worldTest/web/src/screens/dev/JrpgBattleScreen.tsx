import { useMemo, useState } from 'react';
import type { Character } from '@rpg';
import { ARCHER_JOB, HEALER_JOB, SOLDIER_JOB, characterGenerator } from '@core';
import type { Job } from '@core';
import { JrpgArena } from '../../components/battle/JrpgArena';
import { formationFor } from '../../game/formation';
import './JrpgBattleScreen.css';

/**
 * The JRPG battle layout preview (dev tool): two generated squads whose
 * sizes the author tunes live, rendered through the real JrpgArena —
 * the tilted arena, the formation rows, the camera zoom and the
 * turn-order strip react exactly like the small battle screen. The
 * fighters are generator characters (Order jobs, levels 1-3), so the
 * sprites, the micro hp bars and the banner use real data.
 *
 * Placement is count-driven (see game/formation.ts); the dev controls
 * only change how many fighters each side has. The controls ENRICH the
 * arena's own command tray: they arrive as `extraOptions`, appended next
 * to the tray's Attack/Skills cells (the battle bar is never duplicated).
 */

// The squad classes: soldiers, archers and healers. Job position plays no
// part in the layout.
const JOBS: Job[] = [SOLDIER_JOB, ARCHER_JOB, HEALER_JOB];
const MIN_FIGHTERS = 1;
const MAX_FIGHTERS = 12;

/** One generated squad member: an Order job, level 1-3, named by class. */
function makeFighter(id: string, index: number, side: 'ally' | 'enemy'): Character {
    const job = JOBS[index % JOBS.length];
    return characterGenerator({
        job,
        level: 1 + (index % 3),
        id,
        name: `${job.title} ${side === 'ally' ? 'A' : 'E'}${index + 1}`,
    });
}

export function JrpgBattleScreen() {
    const [allyCount, setAllyCount] = useState(3);
    const [enemyCount, setEnemyCount] = useState(3);
    // The fighter wearing the turn cursor (−1 = nobody).
    const [turnIndex, setTurnIndex] = useState(-1);
    const [inspectedId, setInspectedId] = useState<string | undefined>(undefined);

    // The two squads: regenerated whenever a count changes. Placement
    // comes from the arena's formation table, not from character data.
    const roster = useMemo(() => {
        const allies: Character[] = [];
        const enemies: Character[] = [];
        for (let index = 0; index < allyCount; index++) {
            allies.push(makeFighter(`ally_${index}`, index, 'ally'));
        }
        for (let index = 0; index < enemyCount; index++) {
            enemies.push(makeFighter(`enemy_${index}`, index, 'enemy'));
        }
        return { allies, enemies };
    }, [allyCount, enemyCount]);

    // The turn-order strip: allies and enemies interleaved so the strip
    // shows chips of both sides (the real round queue sorts by speed).
    const order = useMemo(() => {
        const entries: { id: string; enemy: boolean }[] = [];
        const size = Math.max(roster.allies.length, roster.enemies.length);
        for (let index = 0; index < size; index++) {
            if (roster.allies[index]) entries.push({ id: roster.allies[index].id, enemy: false });
            if (roster.enemies[index]) entries.push({ id: roster.enemies[index].id, enemy: true });
        }
        return entries;
    }, [roster]);

    // The active ally (the turn cursor + the floor tile). Cycles through
    // the allies, then off, with one button.
    const activeId = turnIndex >= 0 && turnIndex < roster.allies.length ?
        roster.allies[turnIndex].id :
        undefined;
    const cycleTurn = () => {
        const last = roster.allies.length - 1;
        setTurnIndex((value) => (value >= last ? -1 : value + 1));
    };

    const allyShape = (formationFor(allyCount) ?? []).join('+');
    const enemyShape = (formationFor(enemyCount) ?? []).join('+');
    const cycleCount = (value: number, set: (next: number) => void) => {
        set(value >= MAX_FIGHTERS ? MIN_FIGHTERS : value + 1);
    };

    return (
        <div className="newui-page pixel-font" style={{ height: '100%' }}>
            <div className="jrpg-dev-arena" style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                <JrpgArena
                    allies={roster.allies}
                    enemies={roster.enemies}
                    activeId={activeId}
                    order={order}
                    inspectedId={inspectedId}
                    targets={roster.enemies.map((entry) => ({ id: entry.id, label: entry.name }))}
                    onTarget={() => undefined}
                    onInspect={(id) => setInspectedId(id)}
                    onSkill={() => undefined}
                    onFlee={() => undefined}
                    // The dev controls join the arena's own command tray
                    // (4 cells + Attack/Skills = one full lg page).
                    extraOptions={[
                        {
                            id: 'allies',
                            label: `Allies ${allyCount}`,
                            icon: { symbol: 'groups', color: '#fff' },
                            accent: '#3b82f6',
                            sub: `Formation ${allyShape}`,
                            onClick: () => cycleCount(allyCount, setAllyCount),
                        },
                        {
                            id: 'enemies',
                            label: `Enemies ${enemyCount}`,
                            icon: { symbol: 'skull', color: '#fff' },
                            accent: '#dc2626',
                            sub: `Formation ${enemyShape}`,
                            onClick: () => cycleCount(enemyCount, setEnemyCount),
                        },
                        {
                            id: 'turn',
                            label: activeId ? `Turn: ${roster.allies[turnIndex].name}` : 'Turn: none',
                            icon: { symbol: 'ads_click', color: '#fff' },
                            sub: 'Cycle the active fighter',
                            onClick: cycleTurn,
                        },
                    ]}
                />
            </div>
        </div>
    );
}
