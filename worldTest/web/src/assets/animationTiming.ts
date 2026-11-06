// Central animation tuning for the web client. Frame speeds and the
// on-screen sprite sizes live here so the battle look can be adjusted in
// one file instead of hunting the sheet metadata.
export const ANIMATION_TIMING = {
    // Milliseconds per frame.
    idleFrameMs: 320,
    mageIdleFrameMs: 300,
    attackFrameMs: 240,
    effectFrameMs: 160,
    // Battlefield cards / party menu boxes (plain design pixels).
    fichaSpriteBox: 56,
    squadCardBox: 80,
    // The battle waits at least this long for an action's animation, and
    // never longer than the max (one-shots like the magical blast are
    // capped).
    minActionWaitMs: 500,
    maxActionWaitMs: 1700,
} as const;
