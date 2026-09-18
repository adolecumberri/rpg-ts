// Fixed XP values for the individual experience model.
export const XP = {
    // XP for the character that lands the killing blow.
    kill: 10,
    // XP for every other alive party member (assists).
    assist: 2,
    // XP when the killer is this many levels (or more) above the creature.
    overlevelGap: 5,
    overlevelKill: 1,
} as const;
