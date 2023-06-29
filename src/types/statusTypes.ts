
import { keysOfStats } from '.';
import { Status } from '../classes';
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

type StatusConstructor = Partial<Omit<Status, 'id'>>

// type DynamicStatusConstructor = {
//     new <T extends object>(arg?: T): {
//         [x in keyof BaseStatus]: BaseStatus[x]
//     } & T
// }

export {
  AffectedStatDescriptor,
  //   DynamicStatusConstructor,
  StatusDurationPermanent,
  StatusDurationTemporal,
  StatusType,
  StatusDuration,
  StatusApplicationMoment,
  StatusUsageFrequency,
  StatusConstructor,
  StatusActivationFunction,
};
