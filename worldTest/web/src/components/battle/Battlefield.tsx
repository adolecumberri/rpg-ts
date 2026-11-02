import { ROWS, reachableRows } from '@core';
import { BattleCard } from './BattleCard';
import type { BattleUnit } from '../../game/battleUnits';

// The unit snapshot type lives in game/battleUnits (built by
// battleUnitOf); re-exported here so battlefield consumers keep their
// import path.
export type { BattleUnit };

/**
 * The battlefield panel: a team grouped by formation rows, rendered as
 * isolated BattleCard fichas with the selection and the acting
 * character highlighted. Screens just pass their data.
 */
export function Battlefield({
    units,
    selectedIds,
    activeId,
    shrink = false,
    side,
}: {
    units: BattleUnit[];
    selectedIds?: Set<string>;
    activeId?: string;
    shrink?: boolean;
    side?: 'left' | 'right';
}) {
    return (
        <div className={`battle-panel battle-panel-${side}`}>
            {ROWS.map((row) => {
                const members = units.filter((unit) => unit.row === row);
                return members.length === 0 ? null : (
                    <div className="battle-grid-pixel" style={{ marginBottom: 6 }}>
                        {members.map((unit) => (
                            <BattleCard
                                key={unit.id}
                                hp={unit.hp}
                                maxHp={unit.maxHp}
                                icon={unit.icon}
                                sprite={unit.sprite}
                                attackSprite={unit.attackSprite}
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
