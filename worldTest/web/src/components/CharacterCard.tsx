import type { Character } from '@rpg';
import { StatBar } from './StatBar';
import { attackComponentsOf, DEFAULT_ELEMENTS, kindOfElement } from '@core';
import { useGame } from '../game/GameContext';
import { TOAST_MS } from '../constants/toast';

export function CharacterCard({
    character,
    onClick,
    active,
}: {
    character: Character;
    onClick?: () => void;
    active?: boolean;
}) {
    const api = useGame();
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

    // Native tooltip + tap help for every stat chip (longer toast so the
    // explanation can be read).
    const help = (text: string) => ({
        title: text,
        onClick: (event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            api.showToast(text, TOAST_MS.help);
        },
    });

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
            <div style={{ display: 'flex', gap: 14, color: 'var(--muted)', fontSize: 13, flexWrap: 'wrap' }}>
                {physical ? <span {...help(`Attack ${Math.round(physical.amount)}: physical damage, mitigated by defence.`)}>⚔️ {Math.round(physical.amount)}</span> : null}
                {Array.from(elemental).map(([element, amount]) => (
                    <span
                        key={element}
                        {...help(
                            `${DEFAULT_ELEMENTS.get(element)?.name ?? element} +${Math.round(amount)}: ${kindOfElement(element)} bonus damage.`,
                        )}
                    >
                        {DEFAULT_ELEMENTS.get(element)?.icon ?? '✨'} {Math.round(amount)}
                    </span>
                ))}
                <span {...help(`Defence ${Math.round(character.getStat('defence'))}: mitigates physical damage with 50/(50+defence).`)}>
                    🛡️ {Math.round(character.getStat('defence'))}
                </span>
                <span {...help(`Magic Defence ${Math.round(character.getStat('magicDefence'))}: mitigates magical damage with 50/(50+magicDefence).`)}>
                    🔮 {Math.round(character.getStat('magicDefence'))}
                </span>
                <span {...help(`Speed ${Math.round(character.getStat('speed'))}: acts earlier in the round, and more often in the interval battle.`)}>
                    ⚡ {Math.round(character.getStat('speed'))}
                </span>
                <span {...help(`Crit Chance ${Math.round(character.getStat('critChance'))}%: chance that a physical hit becomes a crit.`)}>
                    🎯 {Math.round(character.getStat('critChance'))}%
                </span>
            </div>
        </div>
    );
}
