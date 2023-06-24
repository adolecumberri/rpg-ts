
import { keysOfStats } from '.';
import { STATUS_DURATIONS, STATUS_APPLICATION_MOMENTS, STATUS_USAGE_FREQUENCY, STATUS_TYPES } from '../constants';

interface StatusDurationPermanent {
    type: typeof STATUS_DURATIONS.PERMANENT;
}

interface StatusDurationTemporal {
    type: typeof STATUS_DURATIONS.TEMPORAL;
    value?: number;
}

type StatusActivationFunction = (arg: {
    from: number,
    to: number,
    value: number,
}) => ({
    valueFinal: number,
    valueApplied: number;
});

type StatusType = keyof typeof STATUS_TYPES;

type StatusDuration = StatusDurationPermanent | StatusDurationTemporal;

type StatusApplicationMoment = keyof typeof STATUS_APPLICATION_MOMENTS;

type StatusUsageFrequency = keyof typeof STATUS_USAGE_FREQUENCY;

interface AffectedStatDescriptor {
    type: StatusType;
    from: keysOfStats;
    to: keysOfStats;
    value: number;
    id?: number;
    timesUsed?: number;
    valueToRecover?: number;
    recovers: boolean; // Indica si al acabarse el status la variación de estadísticas se devuelve.
}

interface StatusConstructor {
    duration: StatusDuration;
    applyOn: StatusApplicationMoment;
    usageFrequency: StatusUsageFrequency;
    statsAffected: AffectedStatDescriptor[];
    hasBeenUsed?: boolean;
}

export {
  StatusDurationPermanent,
  StatusDurationTemporal,
  StatusType,
  StatusDuration,
  StatusApplicationMoment,
  StatusUsageFrequency,
  AffectedStatDescriptor,
  StatusConstructor,
  StatusActivationFunction,
};
