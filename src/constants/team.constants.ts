// ---------------------------------------------------------------------------
// Team formation positions. Every team member sits in one of three rows:
// front, center or back. The row multiplies the member's effective taunt
// when enemies pick a random target, so front-liners soak the most hits.
// ---------------------------------------------------------------------------

export const TEAM_POSITIONS = ['front', 'center', 'back'] as const;

export type TeamPosition = typeof TEAM_POSITIONS[number];

// How much the row multiplies the member's taunt stat: a front-liner is
// hit three times as often as a back-liner with the same taunt.
export const POSITION_TAUNT_MULTIPLIERS: Record<TeamPosition, number> = {
    front: 3,
    center: 2,
    back: 1,
};

/**
 * The taunt multiplier of a position. Unknown positions fall back to 1,
 * so legacy data (or content typos) behave like the back row instead of
 * breaking the targeting math.
 */
export function positionTauntMultiplier(position: TeamPosition): number {
    return POSITION_TAUNT_MULTIPLIERS[position] ?? 1;
}
