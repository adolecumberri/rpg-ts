import { useState } from 'react';
import type { Character } from '@rpg';
import {
    ARCHER_JOB,
    HEALER_JOB,
    HybridCombat,
    Items,
    SOLDIER_JOB,
    characterGenerator,
    heldJobOf,
    intervalFromSpeed,
    skillIdsOf,
    specOf,
} from '@core';
import type { HybridCombatant, HybridEvent, Job, SkillSpec } from '@core';
import './RogueliteScreen.css';

// The reward items are item-table entries; the dev flow only reads their
// display text and flat effects.
type RewardItem = {
    name: string;
    description: string;
    effects?: { stat: string; value: number; typeOfModification: string }[];
};

const itemOf = (id: string): RewardItem | undefined =>
    (Items as unknown as Record<string, RewardItem>)[id];

const handOf = (id: string) => Items[id as keyof typeof Items];


// ---------------------------------------------------------------------------
// The roguelite dev flow: build a small team, fight escalating waves of
// generated enemies with the real hybrid combat engine (auto-resolved),
// and pick a weapon reward after every victory. A run ends when the team
// wipes; the log keeps the whole run visible for balancing.
// ---------------------------------------------------------------------------

type Family = 'soldier' | 'archer' | 'healer';

const FAMILIES: { id: Family; label: string; job: Job; weapon: string; sprite: string }[] = [
    { id: 'soldier', label: 'Soldier', job: SOLDIER_JOB, weapon: 'rogue_sword_1', sprite: '⚔' },
    { id: 'archer', label: 'Archer', job: ARCHER_JOB, weapon: 'rogue_bow_1', sprite: '🏹' },
    { id: 'healer', label: 'Healer', job: HEALER_JOB, weapon: 'rogue_staff_1', sprite: '✦' },
];

// The weapon reward pool, one family per job: the tier rises with the wave.
const REWARD_WEAPONS: Record<Family, string[]> = {
    soldier: ['rogue_sword_1', 'rogue_sword_2', 'rogue_sword_3'],
    archer: ['rogue_bow_1', 'rogue_bow_2', 'rogue_bow_3'],
    healer: ['rogue_staff_1', 'rogue_staff_2', 'rogue_staff_3'],
};

const MAX_HEROES = 4;
const MIN_HEROES = 1;

type Phase = 'team' | 'battle' | 'reward' | 'over';

type FightResult = {
    winner: 'allies' | 'enemies' | 'draw';
    ticks: number;
    lines: string[];
};

const familyOf = (job: Job | undefined): Family | undefined => {
    if (!job) return undefined;
    if (job.id === 'soldier') return 'soldier';
    if (job.id === 'archer') return 'archer';
    if (job.id === 'healer') return 'healer';
    return undefined;
};

/** The generated hero of one slot: level 1, ties its class weapon. */
function makeHero(index: number, family: Family): Character {
    const def = FAMILIES.find((entry) => entry.id === family) ?? FAMILIES[0];
    return characterGenerator({
        job: def.job,
        level: 1,
        id: `rogue_hero_${index}`,
        hand: handOf(def.weapon),
        name: `${def.label} ${index + 1}`,
    });
}

/** The wave's enemies: jobs cycle and the level climbs with the wave. */
function makeEnemies(wave: number): Character[] {
    const count = Math.min(MAX_HEROES, 1 + Math.floor((wave - 1) / 2));
    return Array.from({ length: count }, (_, index) => {
        const def = FAMILIES[(wave + index) % FAMILIES.length];
        return characterGenerator({
            job: def.job,
            level: wave + 1,
            id: `rogue_enemy_${wave}_${index}`,
            hand: handOf(def.weapon),
            name: `${def.label} E${index + 1}`,
        });
    });
}

/** The auto skills of a generated fighter (the engine AI casts them). */
function skillsOf(character: Character): SkillSpec[] {
    return skillIdsOf(character)
        .map((id) => specOf(id))
        .filter((spec): spec is SkillSpec => Boolean(spec));
}

/** Runs the whole fight synchronously on the hybrid engine (no manual
 *  fighters: the AI plays both sides) and returns the outcome. */
function simulate(allies: Character[], enemies: Character[]): FightResult {
    const side = (characters: Character[], sideName: 'left' | 'right'): HybridCombatant[] =>
        characters.map((character) => ({
            character,
            interval: intervalFromSpeed(character.getStat('speed')),
            side: sideName,
            manual: false,
            skills: skillsOf(character),
        }));
    const combat = new HybridCombat([...side(allies, 'left'), ...side(enemies, 'right')], {
        maxTicks: 3000,
    });
    const names = new Map<string, string>();
    for (const character of [...allies, ...enemies]) names.set(character.id, character.name);
    const lines: string[] = [];
    let event: HybridEvent = combat.next();
    let guard = 0;
    while (event.kind !== 'end' && guard < 10000) {
        guard += 1;
        if (event.kind === 'auto') {
            const actor = names.get(event.actorId) ?? event.actorId;
            const target = names.get(event.targetId) ?? event.targetId;
            const skill = event.skillId ? specOf(event.skillId)?.name : undefined;
            const action = skill ? `${skill}` : 'hits';
            lines.push(`${actor} ${action} ${target} · ${event.damage} dmg`);
            if (event.heal) lines.push(`${actor} heals ${event.heal}`);
            if (!event.targetAlive) lines.push(`${target} falls`);
        }
        event = combat.next();
    }
    return {
        winner: event.kind === 'end' ? (event.winner === 'left' ? 'allies' : event.winner === 'right' ? 'enemies' : 'draw') : 'draw',
        ticks: event.kind === 'end' ? event.ticks : 0,
        lines,
    };
}

/** Adds the weapon's flat bonuses to the hero (dev-run equipment). */
function equipReward(hero: Character, itemId: string): string {
    const item = itemOf(itemId);
    if (!item) return '';
    for (const effect of item.effects ?? []) {
        if (effect.typeOfModification !== 'BUFF_FIXED') continue;
        if (effect.stat === 'attack') hero.stats.attack += effect.value;
        if (effect.stat === 'magic') hero.stats.magic = (hero.stats.magic ?? 0) + effect.value;
        if (effect.stat === 'defence') hero.stats.defence += effect.value;
    }
    return item.name;
}

/** The three reward options of a wave: tiers open up as the run goes. */
function pickOffers(wave: number, families: Family[]): string[] {
    const tierCap = Math.min(3, 1 + Math.floor((wave - 1) / 2));
    const pool: string[] = [];
    for (const family of families) {
        pool.push(...REWARD_WEAPONS[family].slice(0, tierCap));
    }
    const offers: string[] = [];
    while (offers.length < 3 && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        const [picked] = pool.splice(index, 1);
        if (picked) offers.push(picked);
    }
    return offers;
}

export function RogueliteScreen() {
    const [phase, setPhase] = useState<Phase>('team');
    const [slots, setSlots] = useState<Family[]>(['soldier', 'archer', 'healer']);
    const [heroes, setHeroes] = useState<Character[]>([]);
    const [wave, setWave] = useState(1);
    const [enemies, setEnemies] = useState<Character[]>([]);
    const [result, setResult] = useState<FightResult | null>(null);
    const [offers, setOffers] = useState<string[]>([]);
    const [log, setLog] = useState<string[]>([]);
    const [runLog, setRunLog] = useState<string[]>([]);
    const [weapons, setWeapons] = useState<{ hero: string; item: string }[]>([]);
    const [lastWave, setLastWave] = useState(0);

    const pushLog = (line: string) => setLog((prev) => [line, ...prev].slice(0, 120));
    const pushRun = (line: string) => setRunLog((prev) => [line, ...prev].slice(0, 80));

    const startRun = () => {
        const roster = slots.map((family, index) => makeHero(index, family));
        setHeroes(roster);
        setWave(1);
        setWeapons([]);
        setLog([]);
        setRunLog([`Run started with ${slots.length} heroes.`]);
        beginWave(1);
    };

    const beginWave = (waveNumber: number) => {
        const foes = makeEnemies(waveNumber);
        setEnemies(foes);
        setResult(null);
        setOffers([]);
        setPhase('battle');
        pushLog(`Wave ${waveNumber}: ${foes.map((foe) => foe.name).join(', ')} appear.`);
    };

    const fight = () => {
        const outcome = simulate(heroes, enemies);
        setResult(outcome);
        pushLog(`Wave ${wave} over: ${outcome.winner} after ${outcome.ticks} ticks.`);
        for (const line of outcome.lines.slice(0, 12)) pushLog(line);
        if (outcome.winner === 'allies') {
            const families = slots;
            setOffers(pickOffers(wave, families));
            setPhase('reward');
        } else {
            setLastWave(wave);
            setPhase('over');
            pushRun(`Defeat at wave ${wave}.`);
        }
    };

    const takeReward = (itemId: string) => {
        const def = FAMILIES.find((entry) => entry.weapon === itemId);
        const family = def?.id;
        const hero = heroes.find((entry) => familyOf(heldJobOf(entry)) === family);
        if (!hero) {
            pushLog('Nobody can carry that weapon: skipped.');
            return;
        }
        const name = equipReward(hero, itemId);
        setHeroes([...heroes]);
        setWeapons((prev) => [...prev, { hero: hero.name, item: name }]);
        pushLog(`${hero.name} equips ${name}.`);
        pushRun(`${hero.name} → ${name}`);
        nextWave();
    };

    const nextWave = () => {
        // The heroes patch up between waves (roguelite rest heal).
        for (const hero of heroes) {
            hero.stats.hp = hero.stats.totalHp;
            hero.stats.mana = 0;
        }
        setHeroes([...heroes]);
        const next = wave + 1;
        setWave(next);
        beginWave(next);
    };

    const restart = () => {
        setPhase('team');
        setHeroes([]);
        setWave(1);
        setEnemies([]);
        setResult(null);
        setOffers([]);
        setLog([]);
        setRunLog([]);
        setWeapons([]);
    };

    const heroStatus = (hero: Character) => {
        const hp = Math.max(0, Math.round(hero.stats.hp));
        const maxHp = Math.round(hero.stats.totalHp);
        return `${hero.name} · HP ${hp}/${maxHp} · ATQ ${Math.round(hero.getStat('attack'))}`;
    };

    return (
        <div className="rogue-page pixel-font">
            <div className="rogue-head">
                <span className="rogue-title">ROGUELITE · DEV</span>
                <span className="rogue-wave">{phase === 'team' ? 'SETUP' : `WAVE ${wave}`}</span>
            </div>

            {phase === 'team' ? (
                <div className="rogue-panel">
                    <div className="rogue-label">Pick the team ({slots.length}/{MAX_HEROES})</div>
                    {slots.map((family, index) => (
                        <div className="rogue-slot" key={`slot_${index}`}>
                            <span className="rogue-slot-index">{index + 1}</span>
                            {FAMILIES.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className={`rogue-job-btn${family === entry.id ? ' rogue-job-btn--on' : ''}`}
                                    onClick={() => {
                                        const next = [...slots];
                                        next[index] = entry.id;
                                        setSlots(next);
                                    }}
                                >
                                    {entry.sprite} {entry.label}
                                </button>
                            ))}
                        </div>
                    ))}
                    <div className="rogue-row">
                        <button
                            type="button"
                            className="rogue-btn"
                            disabled={slots.length >= MAX_HEROES}
                            onClick={() => setSlots([...slots, 'soldier'])}
                        >
                            + Hero
                        </button>
                        <button
                            type="button"
                            className="rogue-btn"
                            disabled={slots.length <= MIN_HEROES}
                            onClick={() => setSlots(slots.slice(0, -1))}
                        >
                            − Hero
                        </button>
                        <button type="button" className="rogue-btn rogue-btn--primary" onClick={startRun}>
                            Start run
                        </button>
                    </div>
                    <div className="rogue-label">
                        Waves escalate: one more enemy every other wave, jobs cycle and levels climb.
                        Every win hands out a new weapon; the team heals between waves.
                    </div>
                </div>
            ) : null}

            {phase !== 'team' && heroes.length > 0 ? (
                <div className="rogue-panel">
                    <div className="rogue-label">Team</div>
                    {heroes.map((hero, index) => (
                        <div className="rogue-line" key={`hero_${index}`}>{heroStatus(hero)}</div>
                    ))}
                    <div className="rogue-label">Enemies · wave {wave}</div>
                    {enemies.map((foe) => (
                        <div className="rogue-line rogue-line--enemy" key={`foe_${foe.id}`}>
                            {foe.name} · HP {Math.max(0, Math.round(foe.stats.hp))}/{Math.round(foe.stats.totalHp)}
                        </div>
                    ))}
                </div>
            ) : null}

            {phase === 'battle' ? (
                <div className="rogue-row">
                    <button type="button" className="rogue-btn rogue-btn--primary" onClick={fight}>
                        Fight wave {wave}
                    </button>
                </div>
            ) : null}

            {phase === 'reward' ? (
                <div className="rogue-panel">
                    <div className="rogue-label">Wave {wave} cleared · pick a reward</div>
                    {offers.map((itemId) => (
                        <button
                            type="button"
                            className="rogue-offer"
                            key={itemId}
                            onClick={() => takeReward(itemId)}
                        >
                            <span className="rogue-offer-name">{itemOf(itemId)?.name ?? itemId}</span>
                            <span className="rogue-offer-desc">{itemOf(itemId)?.description ?? ''}</span>
                        </button>
                    ))}
                </div>
            ) : null}

            {phase === 'over' ? (
                <div className="rogue-panel">
                    <div className="rogue-label">
                        The run ends at wave {lastWave}. Weapons earned: {weapons.length}.
                    </div>
                    {weapons.map((entry, index) => (
                        <div className="rogue-line" key={`weapon_${index}`}>
                            {entry.hero} → {entry.item}
                        </div>
                    ))}
                    <div className="rogue-label">Run log</div>
                    {runLog.map((line, index) => (
                        <div className="rogue-line" key={`run_${index}`}>{line}</div>
                    ))}
                    <button type="button" className="rogue-btn rogue-btn--primary" onClick={restart}>
                        New run
                    </button>
                </div>
            ) : null}

            {result ? (
                <div className="rogue-result">
                    {result.winner === 'allies' ? 'VICTORY' : 'DEFEAT'} · {result.ticks} ticks
                </div>
            ) : null}

            <div className="rogue-log">
                {log.map((line, index) => (
                    <div className="rogue-log-line" key={`log_${index}`}>{line}</div>
                ))}
            </div>
        </div>
    );
}
