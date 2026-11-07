import { useReducer, useRef, useState } from 'react';
import { chanceBagFromPercent, MarbleBag, weightedBag } from '@core';
import type { MarbleEntry } from '@core';
import './MarbleBagScreen.css';

/**
 * Marble-bag dev page: exercises the stateful bag utility with three
 * demonstrations — a crit check, an evasion check and a nested drop bag.
 * Drawing removes a marble; an empty bag refills from its authored
 * weights, so a full cycle preserves the authored proportions.
 */

type BagKey = 'crit' | 'evasion' | 'loot';

type LootOutcome = string;

type Bags = {
    crit: MarbleBag<string>;
    evasion: MarbleBag<string>;
    loot: MarbleBag<LootOutcome>;
    rare: MarbleBag<LootOutcome>;
};

function createBags(): Bags {
    const rare = weightedBag<LootOutcome>([
        { item: 'Golden Ring', weight: 2, label: 'rare' },
        { item: 'Moonstone', weight: 1, label: 'rare' },
    ], { name: 'Rare materials' });
    const loot = new MarbleBag<LootOutcome>([
        { item: 'Sword', weight: 5, label: 'Sword' },
        { item: 'Potion', weight: 3, label: 'Potion' },
        { bag: rare, weight: 2, label: 'Rare bag' },
    ], { name: 'Camp loot' });
    return {
        crit: chanceBagFromPercent(25, 'CRIT', 'HIT', { name: 'Crit 25%' }),
        evasion: chanceBagFromPercent(20, 'DODGE', 'HIT', { name: 'Evasion 20%' }),
        loot,
        rare,
    };
}

function entryText(entry: MarbleEntry<LootOutcome>): string {
    if ('bag' in entry) {
        return `nested: ${entry.bag.name} ×${entry.weight ?? 1}`;
    }
    return `${entry.item} ×${entry.weight ?? 1}`;
}

export function MarbleBagScreen() {
    const bagsRef = useRef<Bags | null>(null);
    if (!bagsRef.current) bagsRef.current = createBags();
    const bags = bagsRef.current;
    const [, redraw] = useReducer((tick: number) => tick + 1, 0);
    const [history, setHistory] = useState<{ bag: string; result: string }[]>([]);

    const draw = (key: BagKey, count: number) => {
        const bag = bags[key];
        const results = bag.drawMany(count);
        setHistory((previous) => [
            ...results.map((result) => ({ bag: bag.name, result })),
            ...previous,
        ].slice(0, 24));
        redraw();
    };

    const resetAll = () => {
        (Object.values(bags) as MarbleBag<LootOutcome>[]).forEach((bag) => bag.reset());
        setHistory([]);
        redraw();
    };

    const cards: { key: BagKey; title: string; hint: string }[] = [
        { key: 'crit', title: 'Critical check', hint: '25% CRIT · 100 marbles per cycle' },
        { key: 'evasion', title: 'Evasion check', hint: '20% DODGE · 100 marbles per cycle' },
        { key: 'loot', title: 'Drop bag', hint: 'Nested rare bag resolves its own draw' },
    ];

    return (
        <div className="action-bar-demo marble-page pixel-font">
            <div className="action-bar-demo-content">
                <div className="pixel-panel">
                    <div className="pixel-title">Marble Bag</div>
                    <div className="pixel-caption marble-intro">
                        Draws are without replacement: the bag holds one marble per unit of
                        weight and refills when empty, so every cycle keeps the authored odds.
                        A nested bag is a marble that resolves a draw from its own bag.
                    </div>
                    <div className="marble-actions">
                        <button type="button" className="pixel-btn" onClick={resetAll}>
                            Reset all bags
                        </button>
                        <span className="marble-actions-note">history: {history.length}</span>
                    </div>
                </div>

                <div className="marble-grid">
                    {cards.map((card) => {
                        const bag = bags[card.key];
                        return (
                            <div key={card.key} className="pixel-panel marble-card">
                                <div className="marble-card-head">
                                    <span className="marble-card-title">{card.title}</span>
                                    <span className="marble-card-count">
                                        {bag.remaining}/{bag.size}
                                    </span>
                                </div>
                                <div className="pixel-caption">{card.hint}</div>
                                <div className="marble-card-meta">
                                    drawn {bag.drawCount} · refills {bag.refillCount}
                                </div>
                                <div className="marble-card-buttons">
                                    <button
                                        type="button"
                                        className="pixel-btn pixel-btn--primary"
                                        onClick={() => draw(card.key, 1)}
                                    >
                                        Draw 1
                                    </button>
                                    <button
                                        type="button"
                                        className="pixel-btn"
                                        onClick={() => draw(card.key, 5)}
                                    >
                                        Draw 5
                                    </button>
                                    <button
                                        type="button"
                                        className="pixel-btn"
                                        onClick={() => {
                                            bag.reset();
                                            redraw();
                                        }}
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    <div className="pixel-panel marble-card">
                        <div className="marble-card-head">
                            <span className="marble-card-title">Nested bag</span>
                            <span className="marble-card-count">
                                {bags.rare.remaining}/{bags.rare.size}
                            </span>
                        </div>
                        <div className="pixel-caption">The rare bag pulled by the drop bag above.</div>
                        <div className="marble-card-meta">
                            drawn {bags.rare.drawCount} · refills {bags.rare.refillCount}
                        </div>
                        <div className="marble-card-buttons">
                            <button
                                type="button"
                                className="pixel-btn pixel-btn--primary"
                                onClick={() => {
                                    const results = bags.rare.drawMany(1);
                                    setHistory((previous) => [
                                        ...results.map((result) => ({ bag: bags.rare.name, result })),
                                        ...previous,
                                    ].slice(0, 24));
                                    redraw();
                                }}
                            >
                                Draw 1
                            </button>
                            <button
                                type="button"
                                className="pixel-btn"
                                onClick={() => {
                                    bags.rare.reset();
                                    redraw();
                                }}
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="pixel-panel marble-card marble-entries">
                        <div className="marble-card-title">Drop bag contents</div>
                        {bags.loot.entries.map((entry, index) => (
                            <div key={index} className="marble-entry-row">
                                <span>{entryText(entry)}</span>
                                <span className="marble-entry-weight">
                                    {entry.weight ?? 1} marble{(entry.weight ?? 1) === 1 ? '' : 's'}
                                </span>
                            </div>
                        ))}
                        <div className="marble-card-title marble-entries-subtitle">Rare bag contents</div>
                        {bags.rare.entries.map((entry, index) => (
                            <div key={index} className="marble-entry-row">
                                <span>{entryText(entry)}</span>
                                <span className="marble-entry-weight">
                                    {entry.weight ?? 1} marble{(entry.weight ?? 1) === 1 ? '' : 's'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="pixel-panel marble-card marble-history">
                        <div className="marble-card-head">
                            <span className="marble-card-title">Last draws</span>
                            <span className="marble-card-count">{history.length}</span>
                        </div>
                        {history.length === 0 ? (
                            <div className="pixel-caption">No draws yet.</div>
                        ) : (
                            <div className="marble-history-list">
                                {history.map((entry, index) => (
                                    <div key={index} className="marble-history-row">
                                        <span className="marble-history-bag">{entry.bag}</span>
                                        <span className={`marble-history-result marble-history-result--${
                                            entry.result === 'CRIT' || entry.result === 'DODGE' ? 'good' :
                                                entry.result === 'HIT' ? 'bad' : 'item'
                                        }`}>
                                            {entry.result}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
