import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { PlacePage } from './PlacePage';
import { TeamPage } from './TeamPage';
import { ActionBarTestScreen } from './ActionBarTestScreen';
import { StressFightScreen } from './StressFightScreen';
import { FightGenScreen } from './FightGenScreen';
import { DamagesScreen } from './DamagesScreen';
import { Modal } from '../components/UI/Modal';

/**
 * The new-UI router: a clean-room shell for the pixel-art design. It
 * renders inside the same scaled canvas but shares nothing with the old
 * app chrome (no legacy header/shell) — only pixelUI.css classes.
 * Reachable at ?ui=1 while the design is being built. The header menu
 * opens a modal that lists the test screens as rows.
 */
const PAGES = [
    { id: 'place', label: 'Place' },
    { id: 'team', label: 'Team' },
    { id: 'actions', label: 'Actions' },
    { id: 'stress', label: 'Stress 80v80' },
    { id: 'fightgen', label: 'Fight Gen' },
    { id: 'damages', label: 'Damages' },
] as const;

type PageId = typeof PAGES[number]['id'];

export function NewUiRouter() {
    const [page, setPage] = useState<PageId>('place');
    const [menuOpen, setMenuOpen] = useState(false);
    const api = useGame();

    const exitToGame = () => {
        // Drop the ?ui=1 flag and reload into the regular game router.
        window.location.search = '';
    };

    return (
        <div className="newui-shell pixel-font" style={{ position: 'relative' }}>
            <div className="newui-header">
                <button
                    type="button"
                    className="pixel-btn"
                    style={{ height: 'var(--s8)', padding: '0 var(--s2)' }}
                    aria-label="Menu"
                    onClick={() => setMenuOpen(true)}
                >
                    ☰ Menu
                </button>
                <span className="newui-header-title">UI TEST</span>
                <button className="pixel-btn" style={{ height: 'var(--s8)', padding: '0 var(--s2)' }} onClick={exitToGame}>
                    ← game
                </button>
            </div>

            <div className="newui-body">
                {page === 'place' ? <PlacePage onOpenTeam={() => setPage('team')} /> : null}
                {page === 'team' ? <TeamPage onBack={() => setPage('place')} /> : null}
                {page === 'actions' ? <ActionBarTestScreen /> : null}
                {page === 'stress' ? <StressFightScreen /> : null}
                {page === 'fightgen' ? <FightGenScreen /> : null}
                {page === 'damages' ? <DamagesScreen /> : null}
            </div>

            {api.toast ? <div className="newui-toast">{api.toast}</div> : null}

            <Modal title="Menu" open={menuOpen} onClose={() => setMenuOpen(false)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    {PAGES.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className="pixel-btn"
                            style={{ width: '100%' }}
                            onClick={() => {
                                setPage(entry.id);
                                setMenuOpen(false);
                            }}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
