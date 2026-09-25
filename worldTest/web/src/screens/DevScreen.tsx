import { useState } from 'react';
import type { Character } from '@rpg';
import { CHATS, FATIGUE, FIGHTS, PLACES, SPECIES, XP, allSkillSpecs, describeConditionInput } from '@core';
import type { Mission, MissionStep } from '@core';
import { useGame } from '../game/GameContext';
import { StatBar } from '../components/StatBar';

/**
 * Dev page: a read-only mirror of the content constants, one tab per
 * section (missions, chats, fights, species, people). The steps render
 * as structured rows with kind badges and keyword chips instead of a raw
 * column of strings. The people tab reads the live session, so npc
 * movements (mission travel) show up here too.
 */

const KIND_BADGES: Record<string, { icon: string; color: string }> = {
    dialogue: { icon: '💬', color: '#7f8cff' },
    travel: { icon: '🧭', color: '#4fc3f7' },
    task: { icon: '🧺', color: '#aed581' },
    wait_battle: { icon: '⚔️', color: '#ef5350' },
    hunt: { icon: '🔍', color: '#ffb74d' },
    reward: { icon: '🎁', color: '#f5b942' },
};

function Chip({ text, tone }: { text: string; tone?: string }) {
    return (
        <span
            className="tag"
            style={tone ? { borderColor: tone, color: tone } : undefined}
        >
            {text}
        </span>
    );
}

/** The keyword chips of a step: place, task, battle outcome, flags... */
function stepKeywords(step: MissionStep): string[] {
    const keywords: string[] = [];
    if (step.kind === 'travel') {
        keywords.push(`📍 ${step.placeId}`);
        if (step.allowTravelTo) keywords.push(`route: ${step.allowTravelTo.join(', ')}`);
    }
    if (step.kind === 'task') keywords.push(`🧺 ${step.taskId}`);
    if (step.kind === 'wait_battle') {
        keywords.push(...step.completeOn.map((outcome) => `on ${outcome}`));
        if (step.battle) keywords.push(`⚔️ ${step.battle.fightId}`);
    }
    if (step.kind === 'dialogue' && step.battle) keywords.push(`⚔️ ${step.battle.fightId}`);
    if (step.kind === 'hunt') {
        keywords.push(`target: ${step.foundEncounterId}`);
        keywords.push(
            ...step.hunt.encountersOf().map((entry) => `${entry.id} ${entry.chancePercent}%`),
        );
    }
    if (step.kind === 'reward' && step.flags) keywords.push(...step.flags.map((flag) => `🏁 ${flag}`));
    if ('lines' in step && step.lines && step.lines.length > 0) {
        keywords.push(`💬 ×${step.lines.length}`);
    }
    return keywords;
}

function StepRow({ step, index }: { step: MissionStep; index: number }) {
    const badge = KIND_BADGES[step.kind] ?? { icon: '❔', color: '#9aa1b8' };
    return (
        <div className="stat-row" style={{ alignItems: 'flex-start' }}>
            <span
                className="tag"
                style={{ borderColor: badge.color, color: badge.color, flex: 'none' }}
            >
                {index + 1}
            </span>
            <span style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{step.id}</span>
                    <span className="tag" style={{ borderColor: badge.color, color: badge.color }}>
                        {badge.icon} {step.kind}
                    </span>
                </span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {stepKeywords(step).map((keyword) => (
                        <Chip key={keyword} text={keyword} />
                    ))}
                </span>
            </span>
        </div>
    );
}

function MissionCard({ mission }: { mission: Mission }) {
    return (
        <div className="card" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>{mission.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{mission.id}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '6px 0' }}>
                {mission.requires?.map((id) => <Chip key={id} text={`requires ${id}`} />)}
                {mission.availableAt?.map((id) => <Chip key={id} text={`at ${id}`} />)}
                {mission.requirements?.gold ? (
                    <Chip text={`req 🪙 ${mission.requirements.gold}`} />
                ) : null}
                {mission.requirements?.items?.map((entry) => (
                    <Chip key={entry.itemId} text={`req 🎒 ${entry.quantity}× ${entry.itemId}`} />
                ))}
            </div>

            {mission.npcMoves || mission.unitMoves || mission.unitSpawns ? (
                <div style={{ margin: '6px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#4fc3f7' }}>on accept</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {mission.npcMoves?.map((move) => (
                            <Chip key={move.npcId} text={`👤 ${move.npcId}: ${move.fromPlaceId} → ${move.toPlaceId}`} />
                        ))}
                        {mission.unitMoves?.map((move, index) => (
                            <Chip
                                key={`unit-${index}`}
                                text={`🚶 move ${move.count}× ${move.group ?? 'units'}: ${move.fromPlaceId} → ${move.toPlaceId}`}
                                tone="#aed581"
                            />
                        ))}
                        {mission.unitSpawns?.map((spawn, index) => (
                            <Chip
                                key={`spawn-${index}`}
                                text={`✨ generate ${spawn.count}× ${spawn.name} at ${spawn.placeId}`}
                                tone="#ffb74d"
                            />
                        ))}
                    </div>
                </div>
            ) : null}
            <div className="divider" style={{ margin: '8px 0' }} />
            {mission.steps.map((step, index) => (
                <StepRow key={step.id} step={step} index={index} />
            ))}
        </div>
    );
}

function MissionsColumn() {
    const api = useGame();
    const ids = api.session.missions.registeredIds();
    return (
        <div className="dev-column">
            <div className="section-title">📜 Missions</div>
            {ids.map((id) => {
                const mission = api.session.missions.mission(id);
                return mission ? <MissionCard key={id} mission={mission} /> : null;
            })}
        </div>
    );
}

function ChatsColumn() {
    return (
        <div className="dev-column">
            <div className="section-title">💬 Chats</div>
            {Object.keys(CHATS).map((id) => (
                <div key={id} className="card" style={{ padding: 12, marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>{id}</div>
                    {CHATS[id].lines.map((line, index) => (
                        <div key={index} className="stat-row" style={{ alignItems: 'flex-start' }}>
                            <span className="tag" style={{ flex: 'none' }}>{line.speaker ?? '—'}</span>
                            <span style={{ fontSize: 13 }}>{line.text}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function FightsColumn() {
    const api = useGame();
    const [snapshots] = useState(() =>
        Object.keys(FIGHTS).map((id) => {
            const fight = FIGHTS[id];
            return { id, enemies: fight.enemies(), allies: fight.allies?.() ?? [] };
        }),
    );

    const speciesChip = (character: Character) => {
        if (!character.speciesId) return null;
        const preset = SPECIES[character.speciesId];
        if (!preset) return null;
        const hint = `${preset.name} preset: hp ${preset.base.hp} · atk ${preset.base.attack} · def ${preset.base.defence} · mdef ${preset.base.magicDefence} · spd ${preset.base.speed}`;
        return (
            <span className="tag" style={{ borderColor: '#ffb74d', color: '#ffb74d' }} title={hint}>
                {preset.icon} {character.speciesId}
            </span>
        );
    };

    const describe = (character: Character) =>
        `${character.name} · hp ${character.getStat('hp')} atk ${character.getStat('attack')} def ${character.getStat('defence')} spd ${character.getStat('speed')} taunt ${character.getStat('taunt')} (${character.position})`;

    return (
        <div className="dev-column">
            <div className="section-title">⚔️ Fights</div>
            {snapshots.map(({ id, enemies, allies }) => {
                const fight = FIGHTS[id];
                const rosterAllies = (fight.allyIds ?? [])
                    .map((allyId) => api.session.roster.character(allyId))
                    .filter((character): character is Character => Boolean(character));
                return (
                    <div key={id} className="card" style={{ padding: 12, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700 }}>{id}</span>
                            {fight.mode ? <Chip text={`mode: ${fight.mode}`} tone="#4fc3f7" /> : null}
                            {fight.placeId ? <Chip text={`📍 ${fight.placeId}`} /> : null}
                            {fight.onWin ? <Chip text="onWin" tone="#aed581" /> : null}
                            {fight.onFlee ? <Chip text="onFlee" tone="#ef5350" /> : null}
                            {fight.onLose ? <Chip text="onLose" tone="#ef5350" /> : null}
                        </div>

                        <div className="stat-row" style={{ alignItems: 'flex-start' }}>
                            <span className="label" style={{ flex: 'none' }}>enemies</span>
                            <span style={{ fontSize: 12, minWidth: 0 }}>
                                {enemies.map((enemy) => (
                                    <div key={enemy.id} style={{ margin: '2px 0' }}>
                                        <span className="tag" style={{ flex: 'none' }}>{enemy.id}</span>{' '}
                                        {describe(enemy)} {speciesChip(enemy)}
                                    </div>
                                ))}
                            </span>
                        </div>

                        {rosterAllies.length > 0 ? (
                            <div className="stat-row" style={{ alignItems: 'flex-start' }}>
                                <span className="label" style={{ flex: 'none' }}>allies (roster)</span>
                                <span style={{ fontSize: 12, minWidth: 0 }}>
                                    {rosterAllies.map((ally) => (
                                        <div key={ally.id} style={{ margin: '2px 0' }}>
                                            <span className="tag" style={{ flex: 'none' }}>{ally.id}</span>{' '}
                                            {describe(ally)}{' '}
                                            <Chip text="roster" tone="#aed581" />
                                        </div>
                                    ))}
                                </span>
                            </div>
                        ) : null}

                        {allies.length > 0 ? (
                            <div className="stat-row" style={{ alignItems: 'flex-start' }}>
                                <span className="label" style={{ flex: 'none' }}>allies (generic)</span>
                                <span style={{ fontSize: 12, minWidth: 0 }}>
                                    {allies.map((ally) => (
                                        <div key={ally.id} style={{ margin: '2px 0' }}>
                                            <span className="tag" style={{ flex: 'none' }}>{ally.id}</span>{' '}
                                            {describe(ally)} {speciesChip(ally)}
                                        </div>
                                    ))}
                                </span>
                            </div>
                        ) : null}

                        <button
                            className="btn"
                            style={{ marginTop: 8 }}
                            onClick={() =>
                                api.navigate(
                                    fight.mode === 'hybrid'
                                        ? { name: 'hybrid', placeId: fight.placeId ?? 'farm', fightId: fight.id }
                                        : { name: 'combat', placeId: fight.placeId ?? 'farm', fightId: fight.id },
                                )
                            }
                        >
                            ▶ Replay
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

function SpeciesColumn() {
    return (
        <div className="dev-column">
            <div className="section-title">🧬 Species</div>
            {Object.keys(SPECIES).map((id) => {
                const preset = SPECIES[id];
                const format = (stats: { hp: number; attack: number; defence: number; magicDefence: number; speed: number }) =>
                    `hp ${stats.hp} · atk ${stats.attack} · def ${stats.defence} · mdef ${stats.magicDefence} · spd ${stats.speed}`;
                return (
                    <div key={id} className="card" style={{ padding: 12, marginBottom: 10 }}>
                        <div style={{ fontWeight: 700 }}>{preset.icon} {id}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{preset.name}</div>
                        <div style={{ fontSize: 12 }}>base: {format(preset.base)}</div>
                        <div style={{ fontSize: 12 }}>perLevel: {format(preset.perLevel)}</div>
                    </div>
                );
            })}
        </div>
    );
}

/** The skill catalog with their auto battle policies. */
function SkillsColumn() {
    const specHint = (spec: import('@core').SkillSpec): string[] => {
        const parts: string[] = [];
        if (spec.damage) {
            const total = spec.damage.reduce((sum, component) => sum + component.amount, 0);
            parts.push(`⚔️ ${Math.round(total)}`);
        }
        if (spec.heal) parts.push(`💚 ${spec.heal}`);
        if (spec.statusOnTargets) parts.push(`status → ${spec.statusOnTargets.name}`);
        if (spec.statusOnSelf) parts.push(`status self: ${spec.statusOnSelf.name}`);
        if (spec.reaction) parts.push('reaction');
        return parts;
    };
    return (
        <div className="dev-column">
            <div className="section-title">✨ Skills</div>
            {allSkillSpecs().map((spec) => (
                <div key={spec.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{spec.name}</span>
                        <span className="tag" style={{ flex: 'none' }}>{spec.id}</span>
                        <Chip text={spec.targeting} tone="#4fc3f7" />
                        {spec.numberOfTargets ? <Chip text={`×${spec.numberOfTargets}`} /> : null}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0' }}>{spec.description}</div>
                    {specHint(spec).length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {specHint(spec).map((hint) => <Chip key={hint} text={hint} />)}
                        </div>
                    ) : null}
                    {spec.auto ? (
                        <div style={{ marginTop: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#aed581' }}>auto</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                <Chip text={`chance ${spec.auto.chancePercent ?? 100}%`} />
                                <Chip text={`cooldown ${spec.auto.cooldownActions ?? 0}`} />
                                <Chip text={`match ${spec.auto.conditionMatch ?? 'all'}`} />
                                {(spec.auto.conditions ?? []).map((condition, index) => (
                                    <Chip key={index} text={`if ${describeConditionInput(condition)}`} tone="#ffb74d" />
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

/** The live people of every place and their stats. */
function PeopleColumn() {
    const api = useGame();
    const describe = (character: Character) => {
        const parts = [
            `atk ${Math.round(character.getStat('attack'))}`,
            `def ${Math.round(character.getStat('defence'))}`,
            `spd ${Math.round(character.getStat('speed'))}`,
            `🎯 ${Math.round(character.getStat('taunt'))}`,
        ];
        if (FATIGUE.enabled) parts.push(`😵 ${Math.round(character.getStat('fatigue'))} ftg`);
        return parts.join(' · ');
    };
    return (
        <div className="dev-column">
            <div className="section-title">👥 People</div>
            {PLACES.map((place) => {
                const npcs = api.session.npcsAt(place.id);
                return (
                    <div key={place.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
                        <div style={{ fontWeight: 700 }}>{place.emoji} {place.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{place.id}</div>
                        {npcs.length === 0 ? (
                            <div className="empty" style={{ padding: '6px 0', fontSize: 12 }}>Nobody is here.</div>
                        ) : (
                            npcs.map((npc) => {
                                const character = npc.character;
                                const hp = character.getStat('hp');
                                const totalHp = character.getStat('totalHp');
                                return (
                                    <div key={npc.id} style={{ margin: '8px 0', padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                                            <span className="tag" style={{ flex: 'none' }}>{npc.id}</span>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                                                {character.stats.isAlive === 0 ? '💀 ' : ''}{character.name}
                                            </span>
                                            {npc.group ? (
                                                <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {npc.group}</span>
                                            ) : null}
                                        </div>
                                        <StatBar label="HP" value={hp} max={totalHp} suffix={`/ ${Math.round(totalHp)}`} />
                                        <StatBar
                                            label="XP"
                                            value={character.experience.currentXp}
                                            max={XP.perLevel}
                                            variant="xp"
                                            suffix={`/ ${XP.perLevel} · Lv ${character.experience.level}`}
                                        />
                                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>⚔️ {describe(character)}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function DevScreen() {
    const api = useGame();
    const [tab, setTab] = useState<'missions' | 'chats' | 'fights' | 'species' | 'people' | 'skills'>('missions');

    const tabs = [
        { id: 'missions' as const, icon: '📜', label: 'Missions' },
        { id: 'chats' as const, icon: '💬', label: 'Chats' },
        { id: 'fights' as const, icon: '⚔️', label: 'Fights' },
        { id: 'species' as const, icon: '🧬', label: 'Species' },
        { id: 'people' as const, icon: '👥', label: 'People' },
        { id: 'skills' as const, icon: '✨', label: 'Skills' },
    ];

    return (
        <div className="screen dev-screen">
            <div className="card place-hero">
                <div className="emoji">🛠️</div>
                <h1>Dev</h1>
                <p>Read-only mirror of the content constants.</p>
                <button
                    className="btn btn--primary"
                    style={{ marginTop: 10 }}
                    onClick={() => api.navigate({ name: 'combat', fightId: 'dev_dummy', placeId: 'farm' })}
                >
                    🎯 Training Dummy
                </button>
            </div>
            <div className="dev-tabs">
                {tabs.map((entry) => (
                    <button
                        key={entry.id}
                        className={`dev-tab${tab === entry.id ? ' dev-tab--active' : ''}`}
                        onClick={() => setTab(entry.id)}
                    >
                        {entry.icon} {entry.label}
                    </button>
                ))}
            </div>
            {tab === 'missions' ? <MissionsColumn /> : null}
            {tab === 'chats' ? <ChatsColumn /> : null}
            {tab === 'fights' ? <FightsColumn /> : null}
            {tab === 'species' ? <SpeciesColumn /> : null}
            {tab === 'people' ? <PeopleColumn /> : null}
            {tab === 'skills' ? <SkillsColumn /> : null}
        </div>
    );
}
