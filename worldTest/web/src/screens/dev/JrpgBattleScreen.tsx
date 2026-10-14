import { useMemo, useState } from 'react';
import type { Character } from '@rpg';
import { ARCHER_JOB, HEALER_JOB, SOLDIER_JOB, characterGenerator } from '@core';
import type { Job } from '@core';
import { JrpgArena } from '../../components/battle/JrpgArena';
import './JrpgBattleScreen.css';

/**
 * The JRPG battle layout preview (dev tool): two generated squads whose
 * sizes and row distribution the author tunes live, rendered through
 * the real JrpgArena — the tilted arena, the depth tiers, the camera
 * zoom and the turn-order strip react exactly like the small battle
 * screen. The fighters are generator characters (Order jobs, levels
 * 1-3), so the sprites, the micro hp bars and the banner use real data.
 *
 * The dev controls ENRICH the arena's own command tray: they arrive as
 * `extraOptions`, appended next to the tray's Attack/Skills cells (the
 * battle bar is never duplicated). Each dev button cycles its value,
 * so a new control is just another entry in the page's option list.
 */

type Tier = 'front' | 'center' | 'back';
type Distribution = 'cycle' | 'front' | 'random';

// The depth tiers a formation fills (frontline first).
const TIER_CYCLE: Tier[] = ['front', 'center', 'back'];
// The squad classes: soldiers (front), archers and healers.
const JOBS: Job[] = [SOLDIER_JOB, ARCHER_JOB, HEALER_JOB];
const MIN_FIGHTERS = 1;
const MAX_FIGHTERS = 12;

const DISTRIBUTIONS: { id: Distribution; label: string }[] = [
    { id: 'cycle', label: 'Cycle' },
    { id: 'front', label: 'All front' },
    { id: 'random', label: 'Random' },
];

/** The depth tier a fighter lands in under the chosen distribution. */
function tierFor(index: number, distribution: Distribution): Tier {
    if (distribution === 'front') return 'front';
    if (distribution === 'random') return TIER_CYCLE[Math.floor(Math.random() * TIER_CYCLE.length)];
    return TIER_CYCLE[index % TIER_CYCLE.length];
}

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
    const [distribution, setDistribution] = useState<Distribution>('cycle');
    // Bumped to re-roll the Random rows (harmless for the fixed modes).
    const [seed, setSeed] = useState(0);
    // The fighter wearing the turn cursor (−1 = nobody).
    const [turnIndex, setTurnIndex] = useState(-1);
    const [inspectedId, setInspectedId] = useState<string | undefined>(undefined);

    // The two squads: regenerated whenever a control moves. The seed
    // only reshuffles the Random rows; Cycle and All front are stable.
    const roster = useMemo(() => {
        const allies: Character[] = [];
        const enemies: Character[] = [];
        for (let index = 0; index < allyCount; index++) {
            const character = makeFighter(`ally_${index}`, index, 'ally');
            character.position = tierFor(index, distribution);
            allies.push(character);
        }
        for (let index = 0; index < enemyCount; index++) {
            const character = makeFighter(`enemy_${index}`, index, 'enemy');
            character.position = tierFor(index, distribution);
            enemies.push(character);
        }
        return { allies, enemies };
    }, [allyCount, enemyCount, distribution, seed]);

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

    const tierCounts = (pool: Character[]) => {
        const counts = { front: 0, center: 0, back: 0 };
        for (const character of pool) counts[character.position]++;
        return counts;
    };
    const alliesTiers = tierCounts(roster.allies);
    const enemiesTiers = tierCounts(roster.enemies);

    // The active ally (the turn cursor + the floor tile). Cycles through
    // the allies, then off, with one button.
    const activeId = turnIndex >= 0 && turnIndex < roster.allies.length ?
        roster.allies[turnIndex].id :
        undefined;
    const cycleTurn = () => {
        const last = roster.allies.length - 1;
        setTurnIndex((value) => (value >= last ? -1 : value + 1));
    };

    // Landing on Random always reshuffles the rows (the old Re-roll
    // button, folded into the cycle: back off and on to roll again).
    const cycleDistribution = () => {
        const index = DISTRIBUTIONS.findIndex((entry) => entry.id === distribution);
        const next = DISTRIBUTIONS[(index + 1) % DISTRIBUTIONS.length].id;
        setDistribution(next);
        if (next === 'random') setSeed((value) => value + 1);
    };

    const rowsLabel = DISTRIBUTIONS.find((entry) => entry.id === distribution)?.label ?? distribution;

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
                    // The debug sections overlay: translucent colored
                    // boxes over each depth tier and side.
                    showSections
                    // The dev controls join the arena's own command tray
                    // (4 cells + Attack/Skills = one full lg page).
                    extraOptions={[
                        {
                            id: 'allies',
                            label: `Allies ${allyCount}`,
                            icon: { symbol: 'groups', color: '#fff' },
                            accent: '#3b82f6',
                            sub: `front ${alliesTiers.front} · center ${alliesTiers.center} · back ${alliesTiers.back}`,
                            onClick: () => setAllyCount(allyCount >= MAX_FIGHTERS ? MIN_FIGHTERS : allyCount + 1),
                        },
                        {
                            id: 'enemies',
                            label: `Enemies ${enemyCount}`,
                            icon: { symbol: 'skull', color: '#fff' },
                            accent: '#dc2626',
                            sub: `front ${enemiesTiers.front} · center ${enemiesTiers.center} · back ${enemiesTiers.back}`,
                            onClick: () => setEnemyCount(enemyCount >= MAX_FIGHTERS ? MIN_FIGHTERS : enemyCount + 1),
                        },
                        {
                            id: 'rows',
                            label: `Rows: ${rowsLabel}`,
                            icon: { symbol: 'grid_view', color: '#fff' },
                            sub: 'Cycle · All front · Random (reshuffles)',
                            onClick: cycleDistribution,
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
