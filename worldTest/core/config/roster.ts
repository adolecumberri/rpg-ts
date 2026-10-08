// Fixed values for the party roster: every owned character lives in the
// roster; the active party is the subset that travels and fights.
export const ROSTER = {
    // Maximum characters in the active party at once (the design's
    // six-person squad).
    maxActiveParty: 6,
} as const;
