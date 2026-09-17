import { useGame } from '../game/GameContext';
import { Menu } from '../components/Menu';
import { CharacterCard } from '../components/CharacterCard';

export function NpcScreen({ npcId, placeId }: { npcId: string; placeId: string }) {
    const api = useGame();
    const npc = api.findNpc(npcId);

    if (!npc) {
        return (
            <div className="screen">
                <div className="empty">This character has left.</div>
                <button className="btn" onClick={() => api.back()}>Back</button>
            </div>
        );
    }

    return (
        <div className="screen">
            <CharacterCard character={npc.character} />
            <div className="card" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{npc.talk}</div>
            <Menu
                options={[
                    { icon: '🗣️', label: 'Talk', onClick: () => api.showToast(npc.talk) },
                    {
                        icon: '⚔️',
                        label: npc.recruitOnDefeat ? 'Fight to recruit' : 'Fight',
                        onClick: () => api.navigate({ name: 'combat', npcId: npc.id, placeId }),
                    },
                ]}
            />
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
