import { ROWS, reachableRows } from '@core';
import { BattleCard } from './BattleCard';

/**
 * One fighter shown on the battlefield.
 */
export type BattleUnit = {
    id: string;
    name: string;
    icon?: string;
    // A single idle sheet URL, or the unit's own animation set (idle +
    // attack). The unit owns its references.
    sprite?: string | { idle: string; attack?: string };
    row: 'front' | 'center' | 'back';
    hp: number;
    maxHp: number;
    level?: number;
    // While true the ficha plays the one-shot attack animation.
    attacking?: boolean;
    // Extra line under the hp (reach, statuses...).
    sub?: string;
};

const ROW_TITLES: Record<BattleUnit['row'], string> = {
    front: '🛡️ Front',
    center: '⚔️ Center',
    back: '🏹 Back',
};

/**
 * The battlefield panel: a team grouped by formation rows, rendered as
 * isolated BattleCard fichas with the selection and the acting
 * character highlighted. Screens just pass their data.
 */
export function Battlefield({
    title,
    units,
    selectedIds,
    activeId,
    shrink = false,
    side,
}: {
    title: string;
    units: BattleUnit[];
    selectedIds?: Set<string>;
    activeId?: string;
    shrink?: boolean;
    side?: 'left' | 'right';
}) {

    if (side) {

    }
    return (
        <div className={`battle-panel battle-panel-${side}`} >
            {/* <div className="pixel-title">{title}</div> */}
            {ROWS.map((row) => {
                const members = units.filter((unit) => unit.row === row);
                return members.length === 0 ? null : (
                    <div className="battle-grid-pixel" style={{ marginBottom: 6 }}>
                        {members.map((unit) => (
                            <BattleCard
                                key={unit.id}
                                name={unit.name}
                                hp={unit.hp}
                                maxHp={unit.maxHp}
                                sub={unit.sub}
                                icon={unit.icon}
                                sprite={unit.sprite}
                                level={unit.level}
                                selected={selectedIds?.has(unit.id) ?? false}
                                active={unit.id === activeId}
                                dead={unit.hp <= 0}
                                shrink={shrink}
                                attacking={unit.attacking}
                                dataId={unit.id}
                            />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

/** Which units a given reach can hit inside a team. */
export function reachableIdsIn(units: BattleUnit[], range: 'short' | 'long' | 'all'): Set<string> {
    const occupied = ROWS.filter((row) => units.some((unit) => unit.row === row && unit.hp > 0));
    const rows = reachableRows(range, occupied);
    return new Set(
        units.filter((unit) => unit.hp > 0 && rows.indexOf(unit.row) !== -1).map((unit) => unit.id),
    );
}
