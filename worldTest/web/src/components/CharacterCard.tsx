import type { Character } from '@rpg';
import { StatBar } from './StatBar';
import { attackComponentsOf, DEFAULT_ELEMENTS } from '@core';

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

    const components = attackComponentsOf(character);
    const physical = components.find((component) => component.element === 'physical');
    const elemental = new Map<string, number>();
    for (const component of components) {
        if (component.element === 'physical') continue;
        elemental.set(component.element, (elemental.get(component.element) ?? 0) + component.amount);
    }

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
            <StatBar
                label="XP"
                value={character.experience.currentXp}
                max={character.experience.getXpToNextLevel()}
                variant="xp"
                suffix={`/ ${character.experience.getXpToNextLevel()}`}
            />
            <div style={{ display: 'flex', gap: 14, color: 'var(--muted)', fontSize: 13 }}>
                {physical ? <span>⚔️ {Math.round(physical.amount)}</span> : null}
                {Array.from(elemental).map(([element, amount]) => (
                    <span key={element}>
                        {DEFAULT_ELEMENTS.get(element)?.icon ?? '✨'} {Math.round(amount)}
                    </span>
                ))}
                <span>🛡️ {Math.round(character.getStat('defence'))}</span>
            </div>
        </div>
    );
}
