import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { PlacePage } from './PlacePage';
import { TeamPage } from './TeamPage';
import { WorldMapScreen } from './WorldMapScreen';
import { ActionBarTestScreen } from './ActionBarTestScreen';
import { StressFightScreen } from './StressFightScreen';
import { FightGenScreen } from './FightGenScreen';
import { DamagesScreen } from './DamagesScreen';
import { Modal } from '../components/UI/Modal';

/**
 * The main UI router: a clean-room shell for the pixel-art design. It
 * renders inside the same scaled canvas but shares nothing with the
 * legacy app chrome (no old header/shell) — only pixelUI.css classes.
 * The header menu opens a modal that lists the pages as rows.
 */
const PAGES = [
    { id: 'place', label: 'Place' },
    { id: 'team', label: 'Team' },
    { id: 'worldmap', label: 'World Map' },
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

    return (
        <div className="newui-shell pixel-font" style={{ position: 'relative' }}>
            <div className="newui-header">
                <button
                    type="button"
                    className="pixel-btn"
                    style={{ height: 'var(--s6)', padding: '0 var(--s2)', background: 'var(--bg-light)' }}
                    aria-label="Menu"
                    onClick={() => setMenuOpen(true)}
                >
                    ☰
                </button>
                <span className="newui-header-title">RPG-TS</span>
            </div>

            <div className="newui-body">
                {page === 'place' ? <PlacePage onOpenTeam={() => setPage('team')} /> : null}
                {page === 'team' ? <TeamPage onBack={() => setPage('place')} /> : null}
                {page === 'worldmap' ? <WorldMapScreen /> : null}
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
