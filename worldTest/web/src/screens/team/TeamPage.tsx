import { useState } from 'react';
import type { Character, InventorySlot, Item, TeamPosition } from '@rpg';
import {
    applyEnhancement,
    canEquipItem,
    enhanceableSkillsOf,
    equipFromInventory,
    equippedItemsOf,
    heldJobOf,
    jobById,
    jobLevelOf,
    jobProgressOf,
    loadoutOf,
    pendingJobPicks,
    sectionOfItem,
    specForSkill,
    specOf,
    unequipToInventory,
    ARCHER_JOB,
    HEALER_JOB,
    SOLDIER_JOB,
} from '@core';
import type { EquipmentSection, Job, SkillSpec } from '@core';
import { useGame } from '../../game/GameContext';
import { EQUIP_MESSAGES, messageOf } from '../../game/equipmentMessages';
import { statsOfItems } from '../../game/equipmentStats';
import { OptionsBar } from '../../components/chrome/OptionsBar';
import { TeamCard } from '../../components/character/TeamCard';
import { TeamData } from '../../components/character/TeamData';
import { Icon } from '../../components/chrome/Icon';
import { SkillInfo } from '../../components/character/SkillInfo';
import { StatsColumn } from '../../components/character/StatsColumn';
import { ALL_SECTIONS, EquipPicker, SECTION_META } from '../../components/character/EquipPicker';
import { SPRITES, spriteRoleOf } from '../../assets/sprites';
import { spriteFrameStyle } from '../../assets/spriteFrames';
import { STAT_CATALOG } from '../../game/statCatalog';
import type { StatKey } from '../../game/statCatalog';
import type { IconId } from '../../components/chrome/Icon';

// The jobs the Oficio flow offers (archer, soldier, mage).
const OFFERED_JOBS: Job[] = [ARCHER_JOB, SOLDIER_JOB, HEALER_JOB];

// The stats the job comparison shows, in order: the two vitals plus
// the shared catalog (its curated names and icons).
const JOB_COMPARE_STATS: {
    key: StatKey | 'hp' | 'totalHp';
    label: string;
    icon: IconId;
    prefix?: string;
    suffix?: string;
}[] = [
    { key: 'hp', label: 'HP', icon: 'default' },
    { key: 'totalHp', label: 'Max HP', icon: 'default' },
    ...STAT_CATALOG.map((entry) => ({
        key: entry.key,
        label: entry.label,
        icon: entry.icon,
        prefix: entry.prefix,
        suffix: entry.suffix,
    })),
];

/** One row of the job comparison: the value under the held job, the
 *  change the target job brings and the value under the target job. */
type JobCompareRow = {
    key: string;
    label: string;
    icon: IconId;
    before: string;
    delta: number;
    after: string;
};

/** The stats of a job change, before → change → after: the current
 *  value, the target job's bonus minus the held job's, and the value
 *  the character would have under the target job. */
function jobCompareRows(character: Character, target?: Job): JobCompareRow[] {
    const current = heldJobOf(character);
    return JOB_COMPARE_STATS.map((entry) => {
        const oldBonus = current?.statBonuses[entry.key] ?? 0;
        const newBonus = target ? (target.statBonuses[entry.key] ?? 0) : oldBonus;
        const before = character.getStat(entry.key);
        const after = before - oldBonus + newBonus;
        const format = (value: number) =>
            `${entry.prefix ?? ''}${Math.round(value)}${entry.suffix ?? ''}`;
        return {
            key: String(entry.key),
            label: entry.label,
            icon: entry.icon,
            before: format(before),
            delta: Math.round(after - before),
            after: format(after),
        };
    });
}

/** One skill of the target job's ladder: its name masked to '????'
 *  until the player has seen any party member learn it. */
type JobSkillRow = {
    baseId: string;
    name: string;
    known: boolean;
    atJobLevel: number;
};

function jobSkillRows(job: Job, knows: (skillId: string) => boolean): JobSkillRow[] {
    return (job.progression?.skills ?? []).map((plan) => {
        const known = knows(plan.skillId);
        return {
            baseId: plan.skillId,
            name: known ? (specOf(plan.skillId)?.name ?? plan.skillId) : '????',
            known,
            atJobLevel: plan.atJobLevel,
        };
    });
}

/**
 * The team page (new UI, FFT A2 style): the squad grid, the selected
 * character's data, and the equipment flow — Equipo opens the five-slot
 * view whose bar carries the slot options (back pinned at the 5th
 * place); picking a slot opens the item picker, one section per
 * tab page, with the job/character restrictions applied. Habilidades
 * opens the skills view: the character's skills as rows on top and
 * the selected skill's info in the inferior part of the container.
 */
export function TeamPage({ onBack, initialSelectedId }: { onBack?: () => void; initialSelectedId?: string }) {
    const api = useGame();
    // The party panel can open the team page with a card already picked
    // (its inline squad cards carry the character id).
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
    const [skillsView, setSkillsView] = useState(false);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [equipView, setEquipView] = useState(false);
    const [selectedHole, setSelectedHole] = useState<number | null>(null);
    const [pickerSection, setPickerSection] = useState<EquipmentSection>('espadas');
    // The item whose stats the column previews (tap a row to set it).
    const [previewItem, setPreviewItem] = useState<Item | null>(null);
    // The formation view: the battlefield with the team's columns; the
    // picked character moves with the Frente/Centro/Detrás buttons.
    const [positionView, setPositionView] = useState(false);
    const [positionTargetId, setPositionTargetId] = useState<string | null>(null);
    // The job view (Oficio): the bar lists the accessible jobs; picking
    // one previews the stats variation, then Accept/Back decides.
    const [jobView, setJobView] = useState(false);
    const [jobTargetId, setJobTargetId] = useState<string | null>(null);

    const activeIds = api.session.roster.activeIds();
    const members = activeIds
        .map((id) => api.session.roster.character(id))
        .filter((character): character is Character => Boolean(character));
    const selected = selectedId ? members.find((entry) => entry.id === selectedId) : undefined;
    // The job the Oficio flow previews (undefined = no pick yet).
    const jobTarget = jobTargetId ? jobById(jobTargetId) : undefined;

    const loadout = selected ? loadoutOf(selected) : undefined;
    // The five holes: each holds an item or nothing (Vacío). Any hole
    // may take any equipable item; the engine's kind limits validate.
    const holeRows: Array<{ key: string; hole: number; icon: string; item?: Item }> = (
        loadout ? loadout.holes : []
    ).map((item, index) => ({
        key: `hole_${index}`,
        hole: index,
        icon: item?.definition.icon ?? 'default',
        item,
    }));

    // The character's skills: the live kit (job ladder skills at their
    // current rank + defaults + skill tree), resolved through the
    // catalog, each entry keeping its BASE id (the enhancement pick
    // targets the base skill).
    const skillEntries: { baseId: string; spec: SkillSpec }[] = selected ?
        api.session.availableSkillIds(selected)
            .map((id) => ({ baseId: id, spec: specForSkill(selected, id) }))
            .filter((entry): entry is { baseId: string; spec: SkillSpec } => Boolean(entry.spec)) :
        [];
    const selectedSkill = skillEntries.find((entry) => entry.baseId === selectedSkillId)?.spec;
    // The pending job level-up picks (the card badge's source): the
    // skills the player may raise by one rank.
    const pendingPicks = selected ? pendingJobPicks(selected) : 0;
    const enhanceable = selected ? enhanceableSkillsOf(selected) : [];
    // The selected skill's next rank (the SkillInfo comparison), only
    // while a pick is actually available to spend.
    const enhanceChoice = selected && selectedSkillId && pendingPicks > 0 ?
        enhanceable.find((entry) => entry.skillId === selectedSkillId) :
        undefined;

    const enhance = (skillId: string) => {
        if (!selected) return;
        const ok = applyEnhancement(selected, skillId);
        api.refresh();
        if (ok) {
            const choice = enhanceable.find((entry) => entry.skillId === skillId);
            api.showToast(choice?.nextSpec ?
                `${choice.nextSpec.name} enhanced!` :
                'Skill enhanced!');
        }
    };

    const openHolePicker = (hole: number) => {
        // If the hole already holds equipment, open its own section
        // (a helmet opens Protección cabeza); empty holes open Espadas.
        const item = loadout ? loadout.holes[hole] : undefined;
        setPickerSection(item ? (sectionOfItem(item) ?? 'espadas') : 'espadas');
        setPreviewItem(null);
        setSelectedHole(hole);
    };

    const pickItem = (bagSlot: InventorySlot) => {
        if (!selected || selectedHole === null) return;
        const result = equipFromInventory(api.team, selected, bagSlot.item.id, selectedHole);
        api.refresh();
        // No message on success: the item is equipped and the picker
        // closes instantly. Failures translate the engine's code.
        if (result.ok) {
            setSelectedHole(null);
            setPreviewItem(null);
            return;
        }
        api.showToast(messageOf(result.code));
    };

    const unequipCurrent = () => {
        if (!selected || selectedHole === null) return;
        const result = unequipToInventory(api.team, selected, selectedHole);
        api.refresh();
        if (result.ok) {
            setSelectedHole(null);
            setPreviewItem(null);
        } else {
            api.showToast(messageOf(result.code));
        }
    };

    // The bag lists every section as a tab page, disabled rows when the
    // policy refuses them. The item's own slot decides where it goes.
    const bagSlots = api.team.inventory.getAllItems();
    const pickerSlots = bagSlots.filter(
        (slot) => slot.quantity > 0 && sectionOfItem(slot.item) === pickerSection,
    );
    // The bag slot of the previewed item (the strip's Equip equips it).
    const previewSlot = previewItem ?
        bagSlots.find((slot) => slot.item.id === previewItem.id && slot.quantity > 0) :
        undefined;
    const slotHasItem = selected && selectedHole !== null && loadout ?
        Boolean(loadout.holes[selectedHole]) :
        false;

    // The stats column: with a hole's picker open it starts EMPTY and
    // fills with the tapped row's item; in the general equipment view
    // it shows the equipped items' bonuses.
    const equippedStats = selected ? statsOfItems(equippedItemsOf(selected)) : [];
    const statsRows = previewItem ?
        statsOfItems([previewItem]) :
        selectedHole !== null ? statsOfItems([]) : equippedStats;

    const movePosition = (position: TeamPosition) => {
        if (!positionTargetId) return;
        api.setPosition(positionTargetId, position);
        api.refresh();
    };

    const content = selected ? (
        skillsView ? (
            <div className="equip-view inventory-page">
                <div className="skill-list">
                    {skillEntries.map((entry) => (
                        <div
                            key={entry.baseId}
                            className={`inv-item-row${entry.baseId === selectedSkillId ? ' is-selected' : ''}`}
                            onClick={() => setSelectedSkillId(entry.baseId)}
                        >
                            <span className="inv-item-icon">
                                <span className="material-symbol">auto_awesome</span>
                            </span>
                            <span className="inv-item-info">
                                <span className="inv-item-name">{entry.spec.name}</span>
                            </span>
                            <span className="inv-count">{entry.spec.manaCost ?? 0}</span>
                        </div>
                    ))}
                </div>
                <SkillInfo
                    spec={selectedSkill}
                    nextSpec={enhanceChoice?.nextSpec}
                    rankFrom={enhanceChoice?.currentRank}
                    rankTo={enhanceChoice?.nextRank}
                />
            </div>
        ) : equipView ? (
            <div className="equip-view">
                {selectedHole !== null ? (
                    <EquipPicker
                        title={SECTION_META[pickerSection].label}
                        sections={ALL_SECTIONS}
                        sectionMeta={SECTION_META}
                        activeSection={pickerSection}
                        onSectionChange={setPickerSection}
                        emptyText={EQUIP_MESSAGES['no-copies']}
                        rows={pickerSlots.map((slot) => {
                            const allowed = selected ?
                                canEquipItem(selected, slot.item) :
                                { ok: false, message: '' };
                            const inUse = slot.totalQuantity - slot.quantity;
                            const isPreview = previewItem !== null && previewItem.id === slot.item.id;
                            const rowClass = [
                                'inv-item-row',
                                allowed.ok ? '' : 'inv-item-row--disabled',
                                isPreview ? 'is-selected' : '',
                            ].join(' ');
                            return (
                                <div
                                    key={slot.id}
                                    className={rowClass}
                                    onClick={() => setPreviewItem(slot.item)}
                                >
                                    <span className="inv-item-icon">
                                        <Icon id={slot.item.definition.icon ?? 'default'} size={4} />
                                    </span>
                                    <span className="inv-item-info">
                                        <span className="inv-item-name">{slot.item.name}</span>
                                    </span>
                                    <span className="inv-count">{inUse}</span>
                                    <span className="inv-count">{slot.totalQuantity}</span>
                                </div>
                            );
                        })}
                        actions={[
                            <button
                                key="unequip"
                                type="button"
                                className="pixel-btn pixel-btn--danger"
                                disabled={!slotHasItem}
                                onClick={unequipCurrent}
                            >
                                Unequip
                            </button>,
                            <button
                                key="equip"
                                type="button"
                                className="pixel-btn equip-go"
                                disabled={!previewSlot}
                                onClick={() => {
                                    if (previewSlot) pickItem(previewSlot);
                                }}
                            >
                                Equip
                            </button>,
                        ]}
                    />
                ) : (
                    <div className="pixel-panel">
                        <div className="pixel-title">Equipo · {selected.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
                            {holeRows.map((row) => (
                                <div key={row.key} className="equip-line">
                                    <span className="inv-item-icon">
                                        <Icon id={row.icon} size={4} />
                                    </span>
                                    <span className={row.item ? 'equip-line-item' : 'equip-line-empty'}>
                                        {row.item ? row.item.name : 'Vacío'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <StatsColumn rows={statsRows} />
            </div>
        ) : positionView ? (
            <div className="position-view">
                <div className="position-field">
                    {(['back', 'center', 'front'] as TeamPosition[]).map((row) => {
                        const inRow = members.filter((member) => (member.position ?? 'front') === row);
                        return (
                            <div key={row} className={`position-column position-column--${row}`}>
                                <div className="position-column-title">
                                    {row === 'front' ? 'FRENTE' : row === 'center' ? 'CENTRO' : 'DETRÁS'}
                                </div>
                                <div className="position-column-units">
                                    {inRow.map((member) => (
                                        <button
                                            key={member.id}
                                            type="button"
                                            className={`position-unit${member.id === positionTargetId ? ' position-unit--selected' : ''}`}
                                            onClick={() => setPositionTargetId(member.id)}
                                        >
                                            <span
                                                className="position-unit-sprite"
                                                style={spriteFrameStyle(
                                                    SPRITES[spriteRoleOf(member) ?? 'warrior'].idle,
                                                    0,
                                                    1.5,
                                                )}
                                            />
                                            <span className="position-unit-name">{member.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : jobView ? (
            <div className="job-view">
                <div className="job-view-head">
                    <span className="job-view-title">
                        {heldJobOf(selected)?.title ?? ''}
                        {jobTarget ? ` → ${jobTarget.title}` : ' · pick a job'}
                    </span>
                </div>
                <div className="job-compare">
                    <div className="job-compare-head">
                        <span className="job-compare-label">Stat</span>
                        <span className="job-compare-before">Before</span>
                        <span className="job-compare-delta">Change</span>
                        <span className="job-compare-after">After</span>
                    </div>
                    {jobCompareRows(selected, jobTarget).map((row) => (
                        <div className="job-compare-row" key={row.key}>
                            <span className="job-compare-label">
                                <Icon id={row.icon} size={4} />
                                {row.label}
                            </span>
                            <span className="job-compare-before">{row.before}</span>
                            <span
                                className={`job-compare-delta${row.delta > 0 ? ' job-compare-delta--up' :
                                    row.delta < 0 ? ' job-compare-delta--down' : ''
                                }`}
                            >
                                {row.delta > 0 ? '+' : ''}{row.delta}
                            </span>
                            <span className="job-compare-after">{row.after}</span>
                        </div>
                    ))}
                </div>
                {jobTarget ? (
                    <div className="job-skills">
                        <div className="job-skills-title">Skills · {jobTarget.title}</div>
                        {jobSkillRows(jobTarget, (id) => api.session.knowsSkill(id)).map((row) => (
                            <div
                                className={`job-skill-row${row.known ? '' : ' job-skill-row--unknown'}`}
                                key={row.baseId}
                            >
                                <span className="job-skill-name">{row.name}</span>
                                <span className="job-skill-level">Lv {row.atJobLevel}</span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        ) : (
            <TeamData character={selected} />
        )
    ) : (
        <>
            <div className="squad-card">
                <div className="squad-card-title">THE SQUAD</div>
                {/* <div className="squad-card-text">Tap a character to open their data.</div> */}
            </div>
            <div className="team-grid">
                {members.map((character) => (
                    <TeamCard
                        key={character.id}
                        character={character}
                        selected={character.id === selectedId}
                        onClick={() => setSelectedId(character.id)}
                    />
                ))}
            </div>
        </>
    );

    const bar = selected && !equipView && !skillsView && !positionView && !jobView ? (
        <OptionsBar
            size="lg"
            options={[
                {
                    id: 'equipment',
                    label: 'Equipo',
                    icon: { symbol: 'backpack', color: 'var(--accent)' },
                    onClick: () => setEquipView(true),
                },
                {
                    id: 'skills',
                    label: 'Habilidades',
                    icon: { symbol: 'auto_awesome', color: 'var(--accent)' },
                    badge: pendingPicks > 0 ? '↑' : undefined,
                    onClick: () => {
                        setSelectedSkillId(null);
                        setSkillsView(true);
                    },
                },
                {
                    id: 'position',
                    label: 'Posición',
                    icon: { symbol: 'grid_view', color: 'var(--accent)' },
                    onClick: () => {
                        setPositionTargetId(selectedId);
                        setPositionView(true);
                    },
                },
                {
                    id: 'job',
                    label: 'Job Change',
                    icon: { symbol: 'person', color: 'var(--accent)' },
                    onClick: () => {
                        // Backfill the player's known-skill memory (recruits
                        // that arrived already trained, old saves) before the
                        // page masks unknown skill names.
                        api.session.syncKnownSkills();
                        setJobTargetId(null);
                        setJobView(true);
                    },
                },
            ]}
            back={{
                label: 'Atrás',
                onClick: () => {
                    // Opened from the party panel's inline squad: Back
                    // returns to that squad (the place page), not to the
                    // team page grid.
                    if (initialSelectedId && onBack) {
                        onBack();
                        return;
                    }
                    setSelectedId(null);
                },
            }}
        />
    ) : selected && skillsView ? (
        <OptionsBar
            size="lg"
            options={[{
                id: 'enhance',
                label: 'Enhance',
                icon: { symbol: 'arrow_upward', color: '#fff' },
                accent: '#4ade80',
                sub: pendingPicks > 0 ?
                    `${pendingPicks} pick${pendingPicks > 1 ? 's' : ''} available` :
                    'No level up available',
                disabled: !enhanceChoice,
                disabledReason: !selectedSkillId ?
                    'Select a skill' :
                    pendingPicks <= 0 ? 'No level up available' : 'Already maxed',
                onClick: () => {
                    if (selectedSkillId) enhance(selectedSkillId);
                },
            }]}
            back={{
                label: 'Atrás',
                onClick: () => {
                    setSkillsView(false);
                    setSelectedSkillId(null);
                },
            }}
        />
    ) : selected && equipView ? (
        <OptionsBar
            size="lg"
            pinLast
            options={holeRows.map((row) => ({
                id: row.key,
                label: row.item ? row.item.name : 'Vacío',
                icon: { icon: row.icon },
                onClick: () => openHolePicker(row.hole),
            }))}
            back={{
                label: 'Atrás',
                // While a hole's picker is open, Atrás closes the picker
                // (back to the general equipment view); otherwise it
                // leaves the equipment view.
                onClick: () => {
                    if (selectedHole !== null) {
                        setSelectedHole(null);
                        setPreviewItem(null);
                    } else {
                        setEquipView(false);
                    }
                },
            }}
        />
    ) : selected && positionView ? (
        <OptionsBar
            size="lg"
            options={[
                {
                    id: 'front',
                    label: 'Frente',
                    icon: { symbol: 'north', color: '#fff' },
                    accent: '#ef4444',
                    disabled: !positionTargetId,
                    disabledReason: 'Pick a character',
                    onClick: () => movePosition('front'),
                },
                {
                    id: 'center',
                    label: 'Centro',
                    icon: { symbol: 'horizontal_rule', color: '#fff' },
                    accent: '#f2ca50',
                    disabled: !positionTargetId,
                    disabledReason: 'Pick a character',
                    onClick: () => movePosition('center'),
                },
                {
                    id: 'back',
                    label: 'Detrás',
                    icon: { symbol: 'south', color: '#fff' },
                    accent: '#3b82f6',
                    disabled: !positionTargetId,
                    disabledReason: 'Pick a character',
                    onClick: () => movePosition('back'),
                },
            ]}
            back={{ label: 'Atrás', onClick: () => setPositionView(false) }}
        />
    ) : selected && jobView && !jobTarget ? (
        <OptionsBar
            size="lg"
            options={OFFERED_JOBS.map((job) => {
                const mastered = jobProgressOf(selected, job.id).mastered;
                // The already-held job cannot be selected again.
                const isCurrent = job.id === heldJobOf(selected)?.id;
                return {
                    id: job.id,
                    label: `${job.title}${mastered ? ' ★' : ''}`,
                    icon: { symbol: 'person', color: 'var(--accent)' },
                    sub: isCurrent ? 'Current job' : `Lv.${jobLevelOf(selected, job.id)}`,
                    disabled: isCurrent,
                    disabledReason: 'Current job',
                    onClick: () => setJobTargetId(job.id),
                };
            })}
            back={{
                label: 'Atrás', onClick: () => {
                    setJobView(false);
                    setJobTargetId(null);
                },
            }}
        />
    ) : selected && jobView ? (
        <OptionsBar
            size="lg"
            options={[
                {
                    id: 'accept',
                    label: 'Accept',
                    icon: { symbol: 'check', color: '#fff' },
                    tone: 'primary',
                    disabled: !jobTarget || jobTarget.id === heldJobOf(selected)?.id,
                    disabledReason: jobTarget && jobTarget.id === heldJobOf(selected)?.id ?
                        'Current job' :
                        'Pick a job',
                    onClick: () => {
                        if (!jobTarget) return;
                        api.setJob(selected.id, jobTarget.id);
                        setJobView(false);
                        setJobTargetId(null);
                    },
                },
                {
                    id: 'back',
                    label: 'Back',
                    icon: { symbol: 'chevron_left', color: 'var(--accent)' },
                    onClick: () => setJobTargetId(null),
                },
            ]}
            back={{
                label: 'Atrás', onClick: () => {
                    setJobView(false);
                    setJobTargetId(null);
                },
            }}
        />
    ) : (
        <OptionsBar
            size="lg"
            options={[]}
            back={onBack ? { label: 'Back', onClick: onBack } : undefined}
        />
    );

    return (
        <div className="pixel-font" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="team-main">
                {content}
            </div>

            {bar}
        </div>
    );
}
