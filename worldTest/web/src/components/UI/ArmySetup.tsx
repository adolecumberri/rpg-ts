import { useState } from 'react';
import { Modal } from './Modal';
import { UNIT_PRESETS, presetById } from '../../game/armyPresets';
import type { ArmyGroup, UnitPreset } from '../../game/armyPresets';

const ROWS: Array<ArmyGroup['row']> = ['front', 'center', 'back'];

const ROW_ICONS: Record<ArmyGroup['row'], string> = {
    front: '🛡️',
    center: '⚔️',
    back: '🏹',
};

const clampInt = (value: string, min: number, max: number, fallback: number): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
};

// The army form being filled: the preset picked first, then the row
// (its own modal), the level and the count.
type Draft = {
    presetId: string;
    row: ArmyGroup['row'];
    level: number;
    count: number;
};

/**
 * The army setup page: lists the groups added so far ("10 - Soldier
 * (Lv.1)") and offers the add-army form — pick a preset, then a modal
 * picks the row (front/center/back) plus level (1-100) and count
 * (1-100). Pure input component: the screen owns the groups state.
 */
export function ArmySetup({
    title,
    groups,
    onChange,
    onNext,
    nextLabel = 'Next',
    onBack,
}: {
    title: string;
    groups: ArmyGroup[];
    onChange: (groups: ArmyGroup[]) => void;
    onNext: () => void;
    nextLabel?: string;
    onBack?: () => void;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [draft, setDraft] = useState<Draft | null>(null);

    const pickPreset = (preset: UnitPreset) => {
        setPickerOpen(false);
        setDraft({ presetId: preset.id, row: 'front', level: 1, count: 1 });
    };

    const addDraft = () => {
        if (!draft) return;
        onChange([
            ...groups,
            { presetId: draft.presetId, count: draft.count, row: draft.row, level: draft.level },
        ]);
        setDraft(null);
    };

    const draftPreset = draft ? presetById(draft.presetId) : undefined;

    return (
        <div className="newui-page pixel-font">
            <div className="pixel-panel">
                <div className="pixel-title">{title}</div>
                {groups.length === 0 ? (
                    <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)', marginBottom: 'var(--s2)' }}>
                        No groups yet — add an army.
                    </div>
                ) : (
                    <div style={{ marginBottom: 'var(--s2)' }}>
                        {groups.map((group, index) => {
                            const preset = presetById(group.presetId);
                            return (
                                <div
                                    className="army-line pixel-inset"
                                    key={`${group.presetId}_${group.row}_${group.level}_${index}`}
                                >
                                    <span className="army-line-text">
                                        {group.count} - {preset ? preset.name : group.presetId} (Lv.{group.level})
                                    </span>
                                    <span className="army-line-row">
                                        {ROW_ICONS[group.row]} {group.row}
                                    </span>
                                    <button
                                        type="button"
                                        className="pixel-btn pixel-btn--danger"
                                        style={{ height: 'var(--s8)', minWidth: 'var(--s8)' }}
                                        aria-label="Remove group"
                                        onClick={() => onChange(
                                            groups.filter((entry, entryIndex) => entryIndex !== index),
                                        )}
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {onBack ? (
                        <button type="button" className="pixel-btn" onClick={onBack}>← Back</button>
                    ) : null}
                    <button type="button" className="pixel-btn pixel-btn--primary" onClick={() => setPickerOpen(true)}>
                        + Add army
                    </button>
                    <button
                        type="button"
                        className="pixel-btn"
                        disabled={groups.length === 0}
                        style={groups.length === 0 ? { opacity: 0.5 } : undefined}
                        onClick={onNext}
                    >
                        {nextLabel} ›
                    </button>
                </div>
            </div>

            <Modal title="Add army" open={pickerOpen} onClose={() => setPickerOpen(false)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    {UNIT_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            className="pixel-btn"
                            style={{ width: '100%' }}
                            onClick={() => pickPreset(preset)}
                        >
                            {preset.icon} {preset.name}
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal title="Position" open={draft !== null} onClose={() => setDraft(null)}>
                {draft ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                        <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)' }}>
                            {draft.count} - {draftPreset ? draftPreset.name : draft.presetId} (Lv.{draft.level})
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {ROWS.map((row) => (
                                <button
                                    key={row}
                                    type="button"
                                    className={`pixel-btn${draft.row === row ? ' pixel-btn--primary' : ''}`}
                                    style={{ flex: 1 }}
                                    onClick={() => setDraft({ ...draft, row })}
                                >
                                    {ROW_ICONS[row]} {row}
                                </button>
                            ))}
                        </div>
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                fontSize: 'var(--s3)',
                            }}
                        >
                            <span>Level</span>
                            <input
                                type="number"
                                className="pixel-input"
                                min={1}
                                max={100}
                                inputMode="numeric"
                                value={draft.level}
                                onChange={(event) => setDraft({
                                    ...draft,
                                    level: clampInt(event.target.value, 1, 100, 1),
                                })}
                            />
                        </label>
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                fontSize: 'var(--s3)',
                            }}
                        >
                            <span>Count</span>
                            <input
                                type="number"
                                className="pixel-input"
                                min={1}
                                max={100}
                                inputMode="numeric"
                                value={draft.count}
                                onChange={(event) => setDraft({
                                    ...draft,
                                    count: clampInt(event.target.value, 1, 100, 1),
                                })}
                            />
                        </label>
                        <button type="button" className="pixel-btn pixel-btn--primary" onClick={addDraft}>
                            ✓ Add {draft.count} {draftPreset ? draftPreset.name : ''}
                        </button>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
