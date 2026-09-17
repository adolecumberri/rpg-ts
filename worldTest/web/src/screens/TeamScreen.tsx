import { useGame } from '../game/GameContext';
import { CharacterCard } from '../components/CharacterCard';

export function TeamScreen() {
    const api = useGame();
    const members = api.team.getAll();

    return (
        <div className="screen">
            {members.length === 0 ? (
                <div className="empty">No party members.</div>
            ) : (
                members.map((member) => (
                    <CharacterCard
                        key={member.id}
                        character={member}
                        onClick={() => api.navigate({ name: 'character', characterId: member.id })}
                    />
                ))
            )}
        </div>
    );
}
