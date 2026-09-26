import { useState } from 'react';
import type { Character } from '@rpg';
import { useGame } from '../game/GameContext';

/**
 * The place's look-around menu. For now it holds one option: the
 * fainted corpses left in the place. Picking a corpse asks which party
 * member hauls it (one corpse per carrier), with the Corpse Carrying
 * penalties applied until the fountain revives it.
 */
export function LookAroundScreen() {
    const api = useGame();
    const place = api.currentPlace;
    const corpses = api.session.corpsesAt(place.id);
    const [pickedId, setPickedId] = useState<string | null>(null);

    const picked = pickedId
        ? corpses.find((entry) => entry.character.id === pickedId)?.character
        : undefined;

    const carriers: Character[] = api.team.getAll().filter(
        (member) =>
            member.stats.hp > 0 && !api.session.faints.carriedBy(member.id),
    );

    if (picked) {
        return (
            <div className="screen">
                <div className="section-title">Who carries {picked.name}?</div>
                <p className="empty" style={{ padding: 6 }}>
                    The carrier fights at −50% attack, −60% speed, −40% defence until the
                    corpse is revived at the fountain.
                </p>
                {carriers.length === 0 ? (
                    <div className="empty">Nobody in the party can carry right now.</div>
                ) : (
                    carriers.map((carrier) => (
                        <button
                            key={carrier.id}
                            className="menu-item"
                            onClick={() => {
                                const result = api.session.pickUpCorpse(picked.id, carrier.id);
                                api.refresh();
                                api.showToast(result.message);
                                setPickedId(null);
                            }}
                        >
                            <span className="menu-icon">💪</span>
                            <span className="menu-label">{carrier.name}</span>
                            <span className="menu-sub">
                                HP {Math.round(carrier.getStat('hp'))}/{Math.round(carrier.getStat('totalHp'))}
                            </span>
                        </button>
                    ))
                )}
                <button className="btn" onClick={() => setPickedId(null)}>Back</button>
            </div>
        );
    }

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">🔍</div>
                <h1>{place.name}</h1>
                <p>What did the battle leave behind?</p>
            </div>

            <div className="section-title">⚰️ Fainted corpses</div>
            {corpses.length === 0 ? (
                <div className="empty">Nothing but dust and bloodstains.</div>
            ) : (
                corpses.map(({ character, daysLeft }) => (
                    <button
                        key={character.id}
                        className="menu-item"
                        onClick={() => setPickedId(character.id)}
                    >
                        <span className="menu-icon">⚰️</span>
                        <span className="menu-label">{character.name}</span>
                        <span className="menu-sub">
                            {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'last day!'} · take it to the camp fountain
                        </span>
                    </button>
                ))
            )}

            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
