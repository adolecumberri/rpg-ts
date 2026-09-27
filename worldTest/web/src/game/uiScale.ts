import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// The pixel-art canvas. Every screen is designed against a fixed 320x640
// logical canvas; at boot the app picks the largest integer scale (up to
// UI_MAX_SCALE) that fits the device, so the artwork stays crisp and the
// layout never reflows per resolution.
// ---------------------------------------------------------------------------

export const UI_CANVAS = { width: 320, height: 640 } as const;

export const UI_MAX_SCALE = 4;

/**
 * The canvas multiplier for the current window: always a whole number
 * (floored, never rounded up) so pixels scale crisply — capped at
 * UI_MAX_SCALE. Screens that cannot fit the next whole step letterbox
 * instead of stretching.
 */
export function computeUiScale(windowWidth: number, windowHeight: number): number {
    if (windowWidth <= 0 || windowHeight <= 0) return 1;
    const fit = Math.min(
        windowWidth / UI_CANVAS.width,
        windowHeight / UI_CANVAS.height,
    );
    return Math.max(1, Math.min(UI_MAX_SCALE, Math.floor(fit)));
}

/** The live canvas scale, re-computed on resize/orientation change. */
export function useUiScale(): number {
    const [scale, setScale] = useState<number>(() =>
        typeof window === 'undefined' ? 1 : computeUiScale(window.innerWidth, window.innerHeight),
    );

    useEffect(() => {
        const update = () => {
            const next = computeUiScale(window.innerWidth, window.innerHeight);
            setScale(next);
            // The multiplier is a global CSS variable: components read
            // --ui-scale (and the unit ladder based on --u) whenever
            // they need the live scale.
            document.documentElement.style.setProperty('--ui-scale', String(next));
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('orientationchange', update);
        };
    }, []);

    return scale;
}
