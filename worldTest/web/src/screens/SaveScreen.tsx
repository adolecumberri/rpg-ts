import { useState } from 'react';
import { useGame } from '../game/GameContext';

/**
 * The save manager: shows the current save file (the raw JSON), and
 * offers Load (restore the last saved state) and Reset (wipe the save
 * and start a fresh world).
 */
export function SaveScreen() {
    const api = useGame();
    const [confirming, setConfirming] = useState(false);

    const saveText = (() => {
        try {
            return JSON.stringify(api.session.exportSave(), null, 2);
        } catch {
            return 'The current state could not be serialized.';
        }
    })();

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">💾</div>
                <h1>Save File</h1>
                <p>The game keeps one save in this browser. Here it is, raw.</p>
            </div>

            <div className="card">
                <div className="section-title">Current save file</div>
                <pre className="save-json">{saveText}</pre>
            </div>

            <div className="btn-row">
                <button className="btn" onClick={() => api.load()}>📂 Load</button>
                {confirming ? (
                    <button
                        className="btn btn--danger"
                        onClick={() => {
                            api.reset();
                            setConfirming(false);
                        }}
                    >
                        ⚠️ Really reset?
                    </button>
                ) : (
                    <button className="btn btn--danger" onClick={() => setConfirming(true)}>
                        🗑️ Reset
                    </button>
                )}
            </div>

            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
