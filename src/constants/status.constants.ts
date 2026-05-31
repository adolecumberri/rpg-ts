import { StatusDefinition } from "../classes/StatusInstance";
import { MODIFICATION_TYPES, ModificationTypes } from "./stats.constants";

// Duración de los estados
export const STATUS_DURATIONS = {
    PERMANENT: 'PERMANENT',
    TEMPORAL: 'TEMPORAL',
} as const;

// Cuando se usa el estado
export const STATUS_USAGE_FREQUENCY = {
    ONCE: 'ONCE',
    PER_ACTION: 'PER_ACTION',
} as const;

export const DEFAULT_STATUS_OBJECT: StatusDefinition = {
    duration: { type: STATUS_DURATIONS.TEMPORAL, value: 1 },
    applyOn: 'before_attack',
    usageFrequency: STATUS_USAGE_FREQUENCY.ONCE,
    statsAffected: [],
    name: 'default_status',
};

export type StatusActivationFunction = (arg: {
    from: number,
    to: number,
    value: number,
}) => ({
    finalValue: number,
    initialValue: number;
    variation: number;
});

export type ActionHandler = StatusActivationFunction;

export const ACTION_HANDLERS: Record<ModificationTypes, ActionHandler> = {
    [MODIFICATION_TYPES.BUFF_FIXED]: ({ to, value }) => ({
        finalValue: to + value,
        initialValue: to,
        variation: value,
    }),
    [MODIFICATION_TYPES.BUFF_PERCENTAGE]: ({ from, to, value }) => ({
        finalValue: to + from * (value / 100),
        initialValue: to,
        variation: from * (value / 100),
    }),
    [MODIFICATION_TYPES.DEBUFF_FIXED]: ({ to, value }) => ({
        finalValue: to - value,
        initialValue: to,
        variation: -value,
    }),
    [MODIFICATION_TYPES.DEBUFF_PERCENTAGE]: ({ from, to, value }) => ({
        finalValue: to - from * (value / 100),
        initialValue: to,
        variation: -(from * (value / 100)),
    }),
};


export function ACTION_HANDLER({
    modificationType,
    from,
    to,
    value, }: {
        from: number,
        to: number,
        value: number,
        modificationType: ModificationTypes,
    }) {
    return ACTION_HANDLERS[modificationType]({
        from,
        to,
        value,
    });
}

