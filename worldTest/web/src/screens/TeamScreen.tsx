import { useState } from 'react';
import type { RowPosition } from '@core';
import { useGame } from '../game/GameContext';
import { RosterCard } from '../components/roster/RosterCard';
import { CharacterMenu } from '../components/roster/CharacterMenu';

/**
 * The camp squad page: the player is always in the squad; the camp
 * roster is a 3-column grid of the recruits (portrait, class, stats).
 * Tapping anyone (roster or squad) opens the single character menu:
 * add/remove from the team, formation row and equipment.
 */
export function TeamScreen() {
    const api = useGame();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const limit = api.session.squadLimit();
    const activeIds = api.session.roster.activeIds();
    // The camp roster never includes the player.
    const roster = api.session.roster.all().filter((character) => character.id !== 'player');
    const selected = selectedId ? api.session.roster.character(selectedId) : undefined;

    const extras = Math.max(0, activeIds.length - 1); // the player excluded
    const maxExtras = limit - 1;

    const applyOrder = (ids: string[]) => {
        const result = api.session.setActiveParty(ids);
        api.refresh();
        api.showToast(result.message);
    };

    const toggle = (id: string) => {
        if (id === 'player') return;
        if (api.session.isFainted(id)) {
            api.showToast('The fainted cannot join the squad. Carry them to the camp fountain.');
            return;
        }
        applyOrder(activeIds.includes(id)
            ? activeIds.filter((entry) => entry !== id)
            : [...activeIds, id]);
    };

    const position = (id: string, row: RowPosition) => {
        api.setPosition(id, row);
        api.refresh();
    };

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">🛡️</div>
                <h1>The Squad</h1>
                <p>You plus {maxExtras} more. Tap anyone to open their menu (team, formation, equipment).</p>
            </div>

            <div className="section-title">In the squad ({extras}/{maxExtras} recruits)</div>
            <div className="battle-grid cols-3">
                {activeIds.map((id) => {
                    const character = api.session.roster.character(id);
                    if (!character) return null;
                    return (
                        <RosterCard
                            key={id}
                            character={character}
                            active
                            onClick={() => setSelectedId(id)}
                        />
                    );
                })}
            </div>

            <div className="section-title">Camp roster</div>
            <div className="battle-grid cols-3">
                {roster.map((character) => (
                    <RosterCard
                        key={character.id}
                        character={character}
                        active={activeIds.includes(character.id)}
                        tag={api.session.isFainted(character.id) ? '⚰️ Fainted' : undefined}
                        onClick={() => setSelectedId(character.id)}
                    />
                ))}
            </div>

            {selected ? (
                <CharacterMenu
                    character={selected}
                    inSquad={activeIds.includes(selected.id)}
                    fainted={api.session.isFainted(selected.id)}
                    extras={extras}
                    maxExtras={maxExtras}
                    onToggle={() => toggle(selected.id)}
                    onPosition={(row) => position(selected.id, row)}
                    onClose={() => setSelectedId(null)}
                />
            ) : null}

            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
