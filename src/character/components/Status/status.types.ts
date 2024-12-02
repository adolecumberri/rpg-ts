import { Character } from '../../character';
import Status from '../Status';
import StatusManager from '../StatusManager';
import { STATUS_APPLICATION_MOMENTS, STATUS_DURATIONS, STATUS_TYPES, STATUS_USAGE_FREQUENCY } from './status.constants';

type StatusManagerConstructor = {
    [x in keyof StatusManager]?: StatusManager[x]
}

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
    finalValue: number,
    appliedValue: number;
});

type StatusType = keyof typeof STATUS_TYPES;

type StatusDuration = StatusDurationPermanent | StatusDurationTemporal;

type StatusApplicationMoment = keyof typeof STATUS_APPLICATION_MOMENTS;

type StatusUsageFrequency = keyof typeof STATUS_USAGE_FREQUENCY;

interface AffectedStatDescriptor {
    type: StatusType;
    from: Character['stats'];
    to: Character['stats'];
    value: number;
    id?: number;
    timesUsed?: number;
    valueToRecover?: number;
    recovers: boolean; // Indica si al acabarse el status la variación de estadísticas se devuelve.
}

type StatusConstructor<T extends object = {}> = Partial<
    Status
>


export {
    AffectedStatDescriptor,
    StatusDurationPermanent,
    StatusDurationTemporal,
    StatusType,
    StatusDuration,
    StatusApplicationMoment,
    StatusUsageFrequency,
    StatusConstructor,
    StatusActivationFunction,
    StatusManagerConstructor,
};
