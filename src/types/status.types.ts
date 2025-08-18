import { Character } from '../Classes/Character';
import { BasicStats } from '../Classes/Stats';
import { StatusInstance } from '../Classes/StatusInstance';
import { StatusManager } from '../Classes/StatusManager';
import { STATUS_DURATIONS, STATUS_TYPES, STATUS_USAGE_FREQUENCY } from '../constants/status.constants';
import { NonConflicting } from '../helpers/type.helpers';
import { CoreEvents } from './generalEvents.types';


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

type StatusApplicationMoment = `before_${CoreEvents}` | `after_${CoreEvents}`;

type StatusUsageFrequency = keyof typeof STATUS_USAGE_FREQUENCY;

interface AffectedStatDescriptor<T extends object = any> {
    type: StatusType;
    from: keyof (NonConflicting<T, BasicStats> & BasicStats);
    to: keyof (NonConflicting<T, BasicStats> & BasicStats); // TODO comprobar este tipo
    value: number;
    id?: number;
    timesUsed?: number;
    valueToRecover?: number;
    recovers: boolean; // Indica si al acabarse el status la variación de estadísticas se devuelve.
}

type StatusConstructor<T extends object = {}> = Partial<
    StatusInstance
>


interface StatusDefinition {
    name: string;
    applyOn: StatusApplicationMoment;
    duration: StatusDuration;
    usageFrequency: StatusUsageFrequency;
    statsAffected: AffectedStatDescriptor[];
    onAdd?: (character: Character) => void;
    onRemove?: (character: Character) => void;
} // plantilla sin cambios (sin valueToRecover etc)


export {
    StatusDefinition,
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
