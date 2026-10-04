import { GameProvider } from './game/GameContext';
import { useUiScale } from './game/uiScale';
import { NewUiRouter } from './screens/NewUiRouter';
import type { ReactNode } from 'react';

/**
 * The app shell: the game provider inside the fixed pixel-art canvas.
 * NewUiRouter is the only UI (the legacy screens were removed).
 */
export default function App() {
    return (
        <GameProvider>
            <GameCanvas>
                <NewUiRouter />
            </GameCanvas>
        </GameProvider>
    );
}

/**
 * The fixed 320x640 pixel-art canvas, centered on the page and scaled
 * by the largest whole multiplier that fits the device (max ×4).
 */
function GameCanvas({ children }: { children: ReactNode }) {
    const scale = useUiScale();
    return (
        <div className="app-stage">
            <div
                className="game-canvas"
                style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
            >
                {children}
            </div>
        </div>
    );
}
