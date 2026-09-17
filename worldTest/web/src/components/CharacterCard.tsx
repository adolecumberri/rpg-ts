import type { Character } from '@rpg';
import { StatBar } from './StatBar';

export function CharacterCard({
    character,
    onClick,
    active,
}: {
    character: Character;
    onClick?: () => void;
    active?: boolean;
}) {
    const hp = character.getStat('hp');
    const totalHp = character.getStat('totalHp');
    const dead = character.stats.isAlive <= 0;

    return (
        <div
            className="card character-card"
            onClick={onClick}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                borderColor: active ? 'var(--accent)' : undefined,
            }}
        >
            <div className="name">
                {character.name}
                {dead ? <span className="tag dead">KO</span> : null}
                <span className="tag">Lv {character.experience.level}</span>
            </div>
            <StatBar label="HP" value={hp} max={totalHp} variant="hp" suffix={`/ ${Math.round(totalHp)}`} />
            <div style={{ display: 'flex', gap: 14, color: 'var(--muted)', fontSize: 13 }}>
                <span>⚔️ {Math.round(character.getStat('attack'))}</span>
                <span>🛡️ {Math.round(character.getStat('defence'))}</span>
            </div>
        </div>
    );
}
