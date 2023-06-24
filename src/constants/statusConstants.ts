
// Duración de los estados
const STATUS_DURATIONS = {
    PERMANENT: "PERMANENT",
    TEMPORAL: "TEMPORAL",
} as const;

// Momento de activación de los estados
const STATUS_APPLICATION_MOMENTS = {
    AFTER_ATTACK: "AFTER_ATTACK",
    AFTER_DEFENCE: "AFTER_DEFENCE",
    AFTER_DIE: "AFTER_DIE",
    BEFORE_ATTACK: "BEFORE_ATTACK",
    BEFORE_DEFENCE: "BEFORE_DEFENCE",
    BEFORE_DIE: "BEFORE_DIE",
} as const;

// Cuando se usa el estado
const STATUS_USAGE_FREQUENCY = {
    ONCE: "ONCE",
    PER_ACTION: "PER_ACTION",
} as const;

// Tipo de cambio de estado
const STATUS_TYPES = {
    BUFF_FIXED: "BUFF_FIXED",
    BUFF_PERCENTAGE: "BUFF_PERCENTAGE",
    DEBUFF_FIXED: "DEBUFF_FIXED",
    DEBUFF_PERCENTAGE: "DEBUFF_PERCENTAGE",
} as const;

const DEFAULT_STATUS_OBJECT = {
    duration: { type: STATUS_DURATIONS.PERMANENT },
    applyOn: STATUS_APPLICATION_MOMENTS.AFTER_ATTACK,
    usageFrequency: STATUS_USAGE_FREQUENCY.ONCE,
    statsAffected: [],
    hasBeenUsed: false,
};

export {
    STATUS_DURATIONS,
    STATUS_APPLICATION_MOMENTS,
    STATUS_USAGE_FREQUENCY,
    STATUS_TYPES,
    DEFAULT_STATUS_OBJECT
};
