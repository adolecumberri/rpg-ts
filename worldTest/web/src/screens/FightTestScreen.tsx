import { useState } from 'react';
import { ROWS, reachableRows } from '@core';
import { OptionsBar } from '../components/UI/OptionsBar';
import { TargetBar } from '../components/UI/TargetBar';
import { selectionRulesOf } from '../game/targeting';

type Role = 'warrior' | 'archer' | 'mage';
type Row = 'front' | 'center' | 'back';

type Fighter = {
    id: string;
    name: string;
    icon: string;
    role: Role;
    row: Row;
    hp: number;
    maxHp: number;
    power: number;
    reach: 'short' | 'long' | 'all';
};

const ALLY_START: Fighter[] = [
    { id: 'a_warrior', name: 'Warrior', icon: '⚔️', role: 'warrior', row: 'front', hp: 30, maxHp: 30, power: 8, reach: 'short' },
    { id: 'a_mage', name: 'Mage', icon: '✨', role: 'mage', row: 'center', hp: 20, maxHp: 20, power: 5, reach: 'long' },
    { id: 'a_archer', name: 'Archer', icon: '🏹', role: 'archer', row: 'back', hp:22, maxHp: 22, power: 6, reach: 'all' },
];

const ENEMY_START: Fighter[] = [
    { id: 'e_warrior', name: 'Warrior', icon: '⚔️', role: 'warrior', row: 'front', hp: 30, maxHp: 30, power: 8, reach: 'short' },
    { id: 'e_mage', name: 'Mage', icon: '✨', role: 'mage', row: 'center', hp: 20, maxHp: 20, power: 5, reach: 'long' },
    { id: 'e_archer', name: 'Archer', icon: '🏹', role: 'archer', row: 'back', hp: 22, maxHp: 22, power: 6, reach: 'all' },
];

const ROW_TITLES: Record<Row, string> = {
    front: '🛡️ Front',
    center: '⚔️ Center',
    back: '🏹 Back',
};

type Phase = 'pick' | 'targets';

/**
 * The rebuilt fight section (UI prototype): a 3 vs 3 with one warrior,
 * one mage and one archer per team, basic attacks only. The active
 * ally picks a target through the shared bars (reach respected); then
 * a random enemy strikes back and the turn passes.
 */
export function FightTestScreen() {
    const [allies, setAllies] = useState<Fighter[]>(() => ALLY_START.map((f) => ({ ...f })));
    const [enemies, setEnemies] = useState<Fighter[]>(() => ENEMY_START.map((f) => ({ ...f })));
    const [turn, setTurn] = useState(0);
    const [phase, setPhase] = useState<Phase>('pick');
    const [selected, setSelected] = useState<string[]>([]);
    const [winner, setWinner] = useState<'none' | 'player' | 'enemy'>('none');
    const [log, setLog] = useState<string[]>([]);

    const logLine = (text: string) => setLog((lines) => [text, ...lines].slice(0, 6));

    const aliveAllies = allies.filter((f) => f.hp > 0);
    const aliveEnemies = enemies.filter((f) => f.hp > 0);
    const active = aliveAllies[turn % Math.max(1, aliveAllies.length)];

    const reachableIds = active
        ? new Set(
            aliveEnemies
                .filter((enemy) => reachableRows(active.reach, ROWS.filter((row) =>
                    aliveEnemies.some((entry) => entry.row === row))).indexOf(enemy.row) !== -1)
                .map((enemy) => enemy.id),
        )
        : new Set<string>();

    const attackRules = selectionRulesOf({
        targeting: 'ENEMY',
        count: 1,
        poolSize: aliveEnemies.length,
    });

    const commit = (enemyId: string) => {
        if (!active) return;
        const enemy = enemies.find((entry) => entry.id === enemyId);
        if (!enemy) return;

        setEnemies((prev) => prev.map((entry) =>
            entry.id === enemyId ? { ...entry, hp: Math.max(0, entry.hp - active.power) } : entry,
        ));
        logLine(`${active.name} hits ${enemy.name} for ${active.power}`);

        const remaining = enemies.filter((entry) =>
            entry.id === enemyId ? enemy.hp - active.power > 0 : entry.hp > 0,
        );
        if (remaining.length === 0) {
            setWinner('player');
            setPhase('pick');
            return;
        }

        // Enemy retaliation: a random alive enemy strikes a random ally.
        const striker = remaining[Math.floor(Math.random() * remaining.length)];
        const targets = allies.filter((entry) => entry.hp > 0);
        const victim = targets[Math.floor(Math.random() * targets.length)];
        setAllies((prev) => prev.map((entry) =>
            entry.id === victim.id ? { ...entry, hp: Math.max(0, entry.hp - striker.power) } : entry,
        ));
        logLine(`${striker.name} hits ${victim.name} for ${striker.power}`);

        const survivors = allies.filter((entry) =>
            entry.id === victim.id ? victim.hp - striker.power > 0 : entry.hp > 0,
        );
        if (survivors.length === 0) {
            setWinner('enemy');
            setPhase('pick');
            return;
        }

        setTurn((t) => t + 1);
        setPhase('pick');
        setSelected([]);
    };

    const rematch = () => {
        setAllies(ALLY_START.map((f) => ({ ...f })));
        setEnemies(ENEMY_START.map((f) => ({ ...f })));
        setTurn(0);
        setPhase('pick');
        setSelected([]);
        setWinner('none');
        setLog([]);
    };

    const teamPanel = (team: Fighter[], title: string) => (
        <div className="pixel-panel">
            <div className="pixel-title">{title}</div>
            {(['front', 'center', 'back'] as Row[]).map((row) => {
                const members = team.filter((f) => f.row === row);
                return members.length === 0 ? null : (
                    <div key={row}>
                        <div className="row-banner">{ROW_TITLES[row]}</div>
                        <div className="battle-grid cols-3" style={{ marginBottom: 6 }}>
                            {members.map((fighter) => (
                                <div
                                    key={fighter.id}
                                    className="pixel-cell"
                                    style={{
                                        width: 'auto',
                                        height: 'auto',
                                        padding: 6,
                                        flexDirection: 'column',
                                        gap: 2,
                                        opacity: fighter.hp > 0 ? 1 : 0.45,
                                    }}
                                >
                                    <span style={{ fontSize: 16 }}>{fighter.hp > 0 ? fighter.icon : '💀'}</span>
                                    <span style={{ fontSize: 9 }}>{fighter.name}</span>
                                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                                        {fighter.hp}/{fighter.maxHp} · 🎯 {fighter.reach}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    if (winner !== 'none') {
        return (
            <div className="newui-page pixel-font">
                <div className="pixel-panel" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{winner === 'player' ? '🏆' : '💀'}</div>
                    <div className="pixel-title" style={{ borderBottom: 'none', marginBottom: 4 }}>
                        {winner === 'player' ? 'Victory!' : 'Defeat...'}
                    </div>
                    <button className="pixel-btn pixel-btn--primary" onClick={rematch}>Rematch</button>
                </div>
            </div>
        );
    }

    return (
        <div className="action-bar-demo pixel-font">
            <div className="action-bar-demo-content">
                <div className="pixel-panel">
                    <div className="pixel-title">
                        {phase === 'pick' && active ? `${active.name}'s turn — basic attack` : 'Pick a target'}
                    </div>
                </div>
                {teamPanel(enemies, 'Enemies')}
                {teamPanel(allies, 'Your team')}
                {log.length > 0 ? (
                    <div className="pixel-panel">
                        <div className="pixel-title">Log</div>
                        {log.map((line, index) => (
                            <div key={index} style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                                {line}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {phase === 'targets' && active ? (
                <TargetBar
                    targets={aliveEnemies.map((enemy) => ({
                        id: enemy.id,
                        label: enemy.name,
                        icon: enemy.icon,
                        reachable: reachableIds.has(enemy.id),
                    }))}
                    rules={attackRules}
                    selection={selected}
                    onToggle={(id) => setSelected((current) =>
                        current.indexOf(id) !== -1 ? [] : [id])}
                    onAccept={() => commit(selected[0])}
                    onCancel={() => {
                        setPhase('pick');
                        setSelected([]);
                    }}
                />
            ) : (
                <OptionsBar
                    options={[{
                        id: 'attack',
                        label: 'Attack',
                        icon: '⚔️',
                        tone: 'primary',
                        onClick: () => {
                            setSelected([]);
                            setPhase('targets');
                        },
                    }]}
                    size="lg"
                />
            )}
        </div>
    );
}
