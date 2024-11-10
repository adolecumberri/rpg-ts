
const DEFAULT_STATS = {
    attack: 0,
    defence: 0,
    isAlive: 1,
    hp: 1,
    totalHp: 1,
};

const ATTACK_TYPE = {
    NORMAL: 'normal',
    MISS: 'miss',
    CRITICAL: 'critical',
    TRUE: 'true',
    SKILL: 'skill',
    OTHER: 'other',
} as const;

export {
    DEFAULT_STATS,
    ATTACK_TYPE,
};
