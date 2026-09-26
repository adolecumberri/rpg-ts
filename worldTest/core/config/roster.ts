// Fixed values for the party roster: every owned character lives in the
// roster; the active party is the subset that travels and fights.
export const ROSTER = {
    // Maximum characters in the active party at once. Only the player
    // travels by default; squad missions let the camp pick more.
    maxActiveParty: 1,
} as const;
