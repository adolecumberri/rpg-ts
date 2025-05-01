const ATTACK_TYPE = {
    NORMAL: 'normal',
    MISS: 'miss',
    CRITICAL: 'critical',
    TRUE: 'true',
    SKILL: 'skill',
    MAGIC: 'magic',
    OTHER: 'other',
} as const;

const DEFENCE_TYPE = {
    NORMAL: 'normal',
    EVASION: 'evasion',
    MISS: 'miss',
    TRUE: 'true',
    SKILL: 'skill',
} as const;

export {
    ATTACK_TYPE,
    DEFENCE_TYPE,
};
