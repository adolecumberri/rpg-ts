// ---------------------------------------------------------------------------
// Fixed values of the mana economy. Mana is the spell fuel: skills will
// spend it, characters start every fight at startOfBattle and regain
// regenPerTurn at each turn start, never above total.
// ---------------------------------------------------------------------------
export const MANA = {
    // The mana pool cap every character has.
    total: 30,
    // What a character starts each fight with.
    startOfBattle: 20,
    // Restored at each turn start (capped at total).
    regenPerTurn: 4,
} as const;
