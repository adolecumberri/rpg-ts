import { useState } from 'react';
import type { Character, InventorySlot, Item } from '@rpg';
import {
    applyEnhancement,
    canEquipItem,
    enhanceableSkillsOf,
    equipFromInventory,
    equippedItemsOf,
    heldJobOf,
    heldJobsOf,
    jobById,
    jobLevelOf,
    jobUnlockState,
    jobProgressOf,
    loadoutOf,
    ownedJobSkills,
    pendingJobPicks,
    sectionOfItem,
    secondaryJobOf,
    specForSkill,
    specOf,
    unequipToInventory,
    ALL_JOBS,
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
import { Modal } from '../../components/chrome/Modal';
import { StatsColumn } from '../../components/character/StatsColumn';
import { ALL_SECTIONS, EquipPicker, SECTION_META } from '../../components/character/EquipPicker';
import { portraitUrlOfJob } from '../../constants/portraits';
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
 *  until the player has seen any party member learn it, and the
 *  character's CURRENT level in that job (hidden while unknown). */
type JobSkillRow = {
    baseId: string;
    name: string;
    known: boolean;
    level: number;
};

function jobSkillRows(
    character: Character,
    job: Job,
    knows: (skillId: string) => boolean,
): JobSkillRow[] {
    const progress = jobProgressOf(character, job.id);
    return (job.progression?.skills ?? []).map((plan) => {
        const known = knows(plan.skillId);
        return {
            baseId: plan.skillId,
            name: known ? (specOf(plan.skillId)?.name ?? plan.skillId) : '????',
            known,
            level: progress.skillLevels[plan.skillId] ?? 1,
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
    // The skills flow: null (closed), the hub with the four slots, the two
    // job-skill pages, the second-slot job picker and the passive flow
    // (job list -> that job's passive skills).
    const [skillsView, setSkillsView] = useState<
        'hub' | 'current' | 'secondary' | 'picker' | 'passiveJobs' | 'passiveSkills' | null
    >(null);
    // Which passive slot is being configured (0 = Passive 1, 1 = Passive 2).
    const [passiveSlot, setPassiveSlot] = useState<number | null>(null);
    const [passiveJobId, setPassiveJobId] = useState<string | null>(null);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [equipView, setEquipView] = useState(false);
    const [selectedHole, setSelectedHole] = useState<number | null>(null);
    const [pickerSection, setPickerSection] = useState<EquipmentSection>('espadas');
    // The item whose stats the column previews (tap a row to set it).
    const [previewItem, setPreviewItem] = useState<Item | null>(null);
    // The job view (Oficio): the bar lists the accessible jobs; picking
    // one previews the stats variation, then Accept/Back decides.
    const [jobView, setJobView] = useState(false);
    const [jobTargetId, setJobTargetId] = useState<string | null>(null);
    // The skill whose details modal is open in the job view (null = closed).
    const [jobSkillInfoId, setJobSkillInfoId] = useState<string | null>(null);

    const activeIds = api.session.roster.activeIds();
    const members = activeIds
        .map((id) => api.session.roster.character(id))
        .filter((character): character is Character => Boolean(character));
    const selected = selectedId ? members.find((entry) => entry.id === selectedId) : undefined;
    // The job the Oficio flow previews (undefined = no pick yet).
    const jobTarget = jobTargetId ? jobById(jobTargetId) : undefined;
    // The Oficio's job cards: only the jobs the player knows about
    // (global discovery flags), each with the unlock state for this
    // character (levels/masteries of the jobs it has held).
    const jobPickerRows = selected ?
        OFFERED_JOBS
            .map((job) => ({
                job,
                state: jobUnlockState(
                    selected,
                    job,
                    (flag) => api.session.hasFlag(flag),
                    (id) => jobById(id)?.title ?? id,
                ),
            }))
            .filter((row) => row.state.visible) :
        [];
    // The previewed job's unlock state (shown on the comparison page).
    const jobTargetState = selected && jobTarget ?
        jobUnlockState(
            selected,
            jobTarget,
            (flag) => api.session.hasFlag(flag),
            (id) => jobById(id)?.title ?? id,
        ) :
        undefined;

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

    // The skills slots: the held job's page (first slot), the second job
    // page (a job the character has held before) and the two passive
    // placeholders. The hub is the entry page.
    const heldJob = selected ? heldJobOf(selected) : undefined;
    const heldJobLevel = selected ? jobLevelOf(selected) : 1;
    const secondaryJob = selected ? secondaryJobOf(selected) : undefined;
    const secondarySkillIds = selected && secondaryJob ? ownedJobSkills(selected, secondaryJob.id) : [];
    // The page's skill rows: the second slot's job only, or the live kit
    // (held job + own + tree) WITHOUT the second slot's duplicates. Each
    // entry keeps its BASE id (the enhancement pick targets the base skill).
    const skillEntries: { baseId: string; spec: SkillSpec }[] = selected ?
        (skillsView === 'secondary' ? secondarySkillIds : api.session.availableSkillIds(selected)
            .filter((id) => secondarySkillIds.indexOf(id) === -1))
            .map((id) => ({ baseId: id, spec: specForSkill(selected, id) }))
            .filter((entry): entry is { baseId: string; spec: SkillSpec } => Boolean(entry.spec)) :
        [];
    const selectedSkill = skillEntries.find((entry) => entry.baseId === selectedSkillId)?.spec;
    // The pending job level-up picks (the card badge's source): the
    // skills the player may raise by one rank.
    const pendingPicks = selected ? pendingJobPicks(selected) : 0;
    const enhanceable = selected ? enhanceableSkillsOf(selected) : [];
    // The jobs the second slot may pick: the ones this character has held,
    // never the held job itself.
    const pickableJobs = selected ?
        heldJobsOf(selected)
            .map((id) => jobById(id))
            .filter((job): job is Job => job !== undefined && job.id !== heldJob?.id) :
        [];
    // The hub's four slot summaries: the passive rows name the equipped
    // passive (or None).
    const passiveSlotName = (index: number) => {
        const id = selected?.passiveSlots?.[index];
        if (!id || !selected) return 'None';
        return specForSkill(selected, id)?.name ?? id;
    };
    const slotRows: Array<{ id: string; label: string; value: string; disabled?: boolean }> = [
        {
            id: 'current',
            label: 'Current job skills',
            value: heldJob ? `${heldJob.title} Lv.${heldJobLevel}` : '—',
        },
        {
            id: 'secondary',
            label: 'Other job skills',
            value: secondaryJob && selected ?
                `${secondaryJob.title} Lv.${jobLevelOf(selected, secondaryJob.id)}` :
                'None — pick a held job',
        },
        { id: 'passive1', label: 'Passive 1', value: passiveSlotName(0) },
        { id: 'passive2', label: 'Passive 2', value: passiveSlotName(1) },
    ];

    // The passive flow: pick one of the jobs the character can hold, then
    // a passive skill of that job (none exist in the game yet, so the
    // skill list renders its empty state).
    const passiveJob = passiveJobId ? jobById(passiveJobId) : undefined;
    const passiveSkillsOf = (job: Job | undefined) => (job?.progression?.skills ?? [])
        .filter((plan) => plan.passive || Boolean(specOf(plan.skillId)?.passive));
    // Jobs whose passives may go in the two passive slots: only jobs the
    // player knows about (the discovery flag filters hidden jobs).
    const passiveJobRows = selected ? ALL_JOBS.filter((job) => {
        if (passiveSkillsOf(job).length === 0) return false;
        return jobUnlockState(
            selected,
            job,
            (flag) => api.session.hasFlag(flag),
            (id) => jobById(id)?.title ?? id,
        ).visible;
    }) : [];
    const passiveSkillRows = selected ?
        passiveSkillsOf(passiveJob).map((plan) => ({
            id: plan.skillId,
            spec: specForSkill(selected, plan.skillId),
        })) :
        [];

    const openSlot = (slotId: string) => {
        if (!selected) return;
        setSelectedSkillId(null);
        if (slotId === 'passive1' || slotId === 'passive2') {
            setPassiveSlot(slotId === 'passive1' ? 0 : 1);
            setPassiveJobId(null);
            setSkillsView('passiveJobs');
            return;
        }
        if (slotId === 'current') {
            setSkillsView('current');
            return;
        }
        setSkillsView(secondaryJob ? 'secondary' : 'picker');
    };

    const chooseSecondary = (jobId: string | null) => {
        if (!selected) return;
        api.setSecondaryJob(selected.id, jobId);
        setSelectedSkillId(null);
        setSkillsView(jobId ? 'secondary' : 'hub');
    };
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

    const content = selected ? (
        skillsView === 'hub' ? (
            <div className="equip-view inventory-page">
                <div className="skill-list">
                    {slotRows.map((row) => (
                        <div
                            key={row.id}
                            className={`inv-item-row skill-slot-row${row.disabled ? ' inv-item-row--disabled' : ''}`}
                            onClick={() => openSlot(row.id)}
                        >
                            <span className="inv-item-icon">
                                <span className="material-symbol">
                                    {row.id === 'current' ? 'auto_awesome' :
                                        row.id === 'secondary' ? 'swap_horiz' : 'shield'}
                                </span>
                            </span>
                            <span className="inv-item-info">
                                <span className="inv-item-name">{row.label}</span>
                                <span className="inv-item-sub">{row.value}</span>
                            </span>
                            {row.id === 'current' && pendingPicks > 0 ?
                                <span className="inv-count">{`↑${pendingPicks}`}</span> : null}
                        </div>
                    ))}
                </div>
                <div className="skill-info skill-info--empty">
                    Select a slot to see its skills.
                </div>
            </div>
        ) : skillsView === 'current' || skillsView === 'secondary' ? (
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
                    nextSpec={skillsView === 'current' ? enhanceChoice?.nextSpec : undefined}
                    rankFrom={skillsView === 'current' ? enhanceChoice?.currentRank : undefined}
                    rankTo={skillsView === 'current' ? enhanceChoice?.nextRank : undefined}
                />
            </div>
        ) : skillsView === 'picker' ? (
            <div className="equip-view inventory-page">
                <div className="skill-list">
                    {pickableJobs.length === 0 ? (
                        <div className="inv-item-row inv-item-row--disabled">
                            <span className="inv-item-info">
                                <span className="inv-item-name">No held jobs to add yet</span>
                                <span className="inv-item-sub">Hold a job first, then swap back.</span>
                            </span>
                        </div>
                    ) : pickableJobs.map((job) => (
                        <div
                            key={job.id}
                            className={`inv-item-row${secondaryJob?.id === job.id ? ' is-selected' : ''}`}
                            onClick={() => chooseSecondary(job.id)}
                        >
                            <span className="inv-item-icon">
                                <span className="material-symbol">work</span>
                            </span>
                            <span className="inv-item-info">
                                <span className="inv-item-name">{job.title}</span>
                                <span className="inv-item-sub">{`Lv.${jobLevelOf(selected, job.id)}`}</span>
                            </span>
                        </div>
                    ))}
                    {secondaryJob ? (
                        <div className="inv-item-row" onClick={() => chooseSecondary(null)}>
                            <span className="inv-item-icon">
                                <span className="material-symbol">block</span>
                            </span>
                            <span className="inv-item-info">
                                <span className="inv-item-name">Clear slot</span>
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>
        ) : skillsView === 'passiveJobs' ? (
            <div className="equip-view inventory-page">
                <div className="skill-list">
                    {passiveJobRows.map((job) => {
                        const passives = passiveSkillsOf(job);
                        // A job without passive skills is not pickable: there
                        // is nothing to put in the slot from it.
                        const pickable = passives.length > 0;
                        return (
                            <div
                                key={job.id}
                                className={`inv-item-row${pickable ? '' : ' inv-item-row--disabled'}`}
                                aria-disabled={!pickable}
                                onClick={() => {
                                    if (!pickable) return;
                                    setPassiveJobId(job.id);
                                    setSkillsView('passiveSkills');
                                }}
                            >
                                <span className="inv-item-icon">
                                    <span className="material-symbol">work</span>
                                </span>
                                <span className="inv-item-info">
                                    <span className="inv-item-name">{job.title}</span>
                                    <span className="inv-item-sub">
                                        {pickable ?
                                            `${passives.length} passive${passives.length > 1 ? 's' : ''}` :
                                            'No passive skills'}
                                    </span>
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="skill-info skill-info--empty">
                    {`Passive ${(passiveSlot ?? 0) + 1}: pick a job to see its passive skills.`}
                </div>
            </div>
        ) : skillsView === 'passiveSkills' ? (
            <div className="equip-view inventory-page">
                <div className="skill-list">
                    {passiveSkillRows.length === 0 ? (
                        <div className="inv-item-row inv-item-row--disabled">
                            <span className="inv-item-icon">
                                <span className="material-symbol">shield</span>
                            </span>
                            <span className="inv-item-info">
                                <span className="inv-item-name">No passive skills yet</span>
                                <span className="inv-item-sub">
                                    {`${passiveJob?.title ?? 'This job'} has no passives in the game yet.`}
                                </span>
                            </span>
                        </div>
                    ) : passiveSkillRows.map((row) => (
                        <div
                            key={row.id}
                            className="inv-item-row"
                            onClick={() => {
                                if (!selected || passiveSlot === null) return;
                                api.setPassiveSlot(selected.id, passiveSlot, row.id);
                                setSkillsView('hub');
                                setPassiveJobId(null);
                                setPassiveSlot(null);
                            }}
                        >
                            <span className="inv-item-icon">
                                <span className="material-symbol">shield</span>
                            </span>
                            <span className="inv-item-info">
                                <span className="inv-item-name">{row.spec?.name ?? row.id}</span>
                            </span>
                        </div>
                    ))}
                    {selected && passiveSlot !== null && selected.passiveSlots?.[passiveSlot] ? (
                        <div
                            className="inv-item-row"
                            onClick={() => {
                                api.setPassiveSlot(selected.id, passiveSlot, null);
                                setSkillsView('hub');
                                setPassiveJobId(null);
                                setPassiveSlot(null);
                            }}
                        >
                            <span className="inv-item-icon">
                                <span className="material-symbol">block</span>
                            </span>
                            <span className="inv-item-info">
                                <span className="inv-item-name">Clear slot</span>
                            </span>
                        </div>
                    ) : null}
                </div>
                {passiveSkillRows.length > 0 ? (
                    <SkillInfo spec={selectedSkill} />
                ) : (
                    <div className="skill-info skill-info--empty">
                        {`No passive skills exist in the game yet. ${passiveSlot !== null ? `Passive ${passiveSlot + 1}` : ''}`}
                    </div>
                )}
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
        ) : jobView && !jobTarget ? (
            <div className="job-pick">
                <div className="job-pick-head">
                    <span className="job-pick-title">Jobs · {selected.name}</span>
                </div>
                <div className="job-pick-grid">
                    {jobPickerRows.map(({ job, state }) => {
                        const level = jobLevelOf(selected, job.id);
                        const mastered = jobProgressOf(selected, job.id).mastered;
                        const isCurrent = job.id === heldJobOf(selected)?.id;
                        const locked = !state.ok;
                        return (
                            <button
                                key={job.id}
                                type="button"
                                className={[
                                    'job-pick-card',
                                    isCurrent ? 'job-pick-card--current' : '',
                                    locked ? 'job-pick-card--locked' : '',
                                ].join(' ')}
                                disabled={locked}
                                onClick={() => setJobTargetId(job.id)}
                            >

                                {!isCurrent && !state.ok ? (
                                    <div style={{ width: "var(--s34)", height: "var(--s5)", position: "absolute", top: "50%", backgroundColor: "#eaeaea" }}>
                                        <span className="job-pick-req">{state.requirementText}</span>
                                    </div>
                                ) : null}

                                <span className="job-pick-name">
                                    <span className="job-pick-level">Lv.{level}</span> {job.title}{mastered ? ' ★' : ''}
                                </span>
                                <div style={{ display: "flex", width: 'var(--s24)', }}>

                                    <img
                                        className="job-pick-portrait"
                                        src={portraitUrlOfJob(job.id)}
                                        alt={job.title}
                                    />
                                    <div style={{ width: 'var(--s16)', }}>
                                        {isCurrent ? <span className="job-pick-current">Current</span> : null}




                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div >
        ) : jobView ? (
            <div className="job-view">
                <div className="job-view-head">
                    <span className="job-view-title">{jobTarget?.title ?? 'Job'}</span>
                </div>
                {jobTarget && jobTargetState && !jobTargetState.ok ? (
                    <div className="job-view-requirement">{jobTargetState.reason}</div>
                ) : null}
                {jobTarget ? (
                    <div className="job-detail">
                        <div className="job-detail-image">
                            <img
                                className="job-detail-portrait"
                                src={portraitUrlOfJob(jobTarget.id)}
                                alt={jobTarget.title}
                            />
                        </div>
                        <div className="job-detail-side">
                            <div className="job-detail-level">
                                Lv.{jobLevelOf(selected, jobTarget.id)}
                            </div>
                            <div className="job-skills">
                                <div className="job-skills-title">Skills</div>
                                {jobSkillRows(selected, jobTarget, (id) => api.session.knowsSkill(id)).map((row) => (
                                    <div
                                        className={`job-skill-row${row.known ? '' : ' job-skill-row--unknown'}`}
                                        key={row.baseId}
                                    >
                                        <span className="job-skill-name">{row.name}</span>
                                        {row.known ? (
                                            <span className="job-skill-level">Lv {row.level}</span>
                                        ) : null}
                                        {row.known ? (
                                            <button
                                                type="button"
                                                className="job-skill-eye"
                                                aria-label={`Details of ${row.name}`}
                                                onClick={() => setJobSkillInfoId(row.baseId)}
                                            >
                                                <Icon id="eye" size={4} />
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
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
                <Modal
                    title={jobSkillInfoId ? specOf(jobSkillInfoId)?.name ?? 'Skill' : 'Skill'}
                    open={jobSkillInfoId !== null}
                    onClose={() => setJobSkillInfoId(null)}
                    centered
                >
                    <SkillInfo spec={jobSkillInfoId ? specOf(jobSkillInfoId) : undefined} />
                </Modal>
            </div >
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

    const bar = selected && !equipView && !skillsView && !jobView ? (
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
                        setSkillsView('hub');
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
    ) : selected && skillsView === 'hub' ? (
        <OptionsBar
            size="lg"
            options={[
                {
                    id: 'current',
                    label: 'Current job',
                    icon: { symbol: 'auto_awesome', color: 'var(--accent)' },
                    sub: heldJob ? `${heldJob.title} Lv.${heldJobLevel}` : '—',
                    badge: pendingPicks > 0 ? '↑' : undefined,
                    onClick: () => openSlot('current'),
                },
                {
                    id: 'secondary',
                    label: 'Other job',
                    icon: { symbol: 'swap_horiz', color: 'var(--accent)' },
                    sub: secondaryJob ?
                        `${secondaryJob.title} Lv.${jobLevelOf(selected, secondaryJob.id)}` :
                        'Pick a held job',
                    onClick: () => openSlot('secondary'),
                },
                {
                    id: 'passive1',
                    label: 'Passive 1',
                    icon: { symbol: 'shield', color: 'var(--accent)' },
                    sub: 'None',
                    onClick: () => openSlot('passive1'),
                },
                {
                    id: 'passive2',
                    label: 'Passive 2',
                    icon: { symbol: 'shield', color: 'var(--accent)' },
                    sub: 'None',
                    onClick: () => openSlot('passive2'),
                },
            ]}
            back={{
                label: 'Atrás',
                onClick: () => {
                    setSkillsView(null);
                    setSelectedSkillId(null);
                },
            }}
        />
    ) : selected && skillsView === 'current' ? (
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
                    setSkillsView('hub');
                    setSelectedSkillId(null);
                },
            }}
        />
    ) : selected && skillsView === 'secondary' ? (
        <OptionsBar
            size="lg"
            options={[{
                id: 'change-job',
                label: 'Change slot job',
                icon: { symbol: 'swap_horiz', color: 'var(--accent)' },
                sub: secondaryJob?.title,
                onClick: () => {
                    setSelectedSkillId(null);
                    setSkillsView('picker');
                },
            }]}
            back={{
                label: 'Atrás',
                onClick: () => {
                    setSkillsView('hub');
                    setSelectedSkillId(null);
                },
            }}
        />
    ) : selected && skillsView === 'picker' ? (
        <OptionsBar
            size="lg"
            options={[]}
            back={{
                label: 'Atrás',
                onClick: () => {
                    setSkillsView('hub');
                    setSelectedSkillId(null);
                },
            }}
        />
    ) : selected && skillsView === 'passiveJobs' ? (
        <OptionsBar
            size="lg"
            options={[]}
            back={{
                label: 'Atrás',
                onClick: () => {
                    setSkillsView('hub');
                    setPassiveSlot(null);
                    setPassiveJobId(null);
                },
            }}
        />
    ) : selected && skillsView === 'passiveSkills' ? (
        <OptionsBar
            size="lg"
            options={[{
                id: 'change-job',
                label: 'Change job',
                icon: { symbol: 'swap_horiz', color: 'var(--accent)' },
                sub: passiveJob?.title,
                onClick: () => {
                    setPassiveJobId(null);
                    setSkillsView('passiveJobs');
                },
            }]}
            back={{
                label: 'Atrás',
                onClick: () => {
                    setPassiveJobId(null);
                    setSkillsView('passiveJobs');
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
    ) : selected && jobView && !jobTarget ? (
        <OptionsBar
            size="lg"
            options={[]}
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
                    disabled: !jobTarget || jobTarget.id === heldJobOf(selected)?.id ||
                        (jobTargetState ? !jobTargetState.ok : true),
                    disabledReason: jobTarget && jobTarget.id === heldJobOf(selected)?.id ?
                        'Current job' :
                        jobTargetState && !jobTargetState.ok ?
                            jobTargetState.reason :
                            'Pick a job',
                    onClick: () => {
                        if (!jobTarget) return;
                        api.changeJob(selected.id, jobTarget.id);
                        setJobView(false);
                        setJobTargetId(null);
                    },
                },
                {
                    id: 'back',
                    label: 'Jobs',
                    icon: { symbol: 'grid_view', color: 'var(--accent)' },
                    sub: 'Back to the job list',
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
