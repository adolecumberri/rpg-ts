import { StatusDefinition } from '../types/status.types';


// Duración de los estados
const STATUS_DURATIONS = {
    PERMANENT: 'PERMANENT',
    TEMPORAL: 'TEMPORAL',
} as const;

// Cuando se usa el estado
const STATUS_USAGE_FREQUENCY = {
    ONCE: 'ONCE',
    PER_ACTION: 'PER_ACTION',
} as const;

// Tipo de cambio de estado
const STATUS_TYPES = {
    BUFF_FIXED: 'BUFF_FIXED',
    BUFF_PERCENTAGE: 'BUFF_PERCENTAGE',
    DEBUFF_FIXED: 'DEBUFF_FIXED',
    DEBUFF_PERCENTAGE: 'DEBUFF_PERCENTAGE',
} as const;

const DEFAULT_STATUS_OBJECT: StatusDefinition = {
    duration: { type: STATUS_DURATIONS.TEMPORAL, value: 1 },
    applyOn: 'before_attack',
    usageFrequency: STATUS_USAGE_FREQUENCY.ONCE,
    statsAffected: [],
    name: 'default_status',
};

export {
    STATUS_DURATIONS,
    STATUS_USAGE_FREQUENCY,
    STATUS_TYPES,
    DEFAULT_STATUS_OBJECT,
};
