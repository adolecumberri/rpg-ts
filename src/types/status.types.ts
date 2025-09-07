import { Character } from '../Classes/Character';
import { BasicStats } from '../Classes/Stats';
import { StatusInstance } from '../Classes/StatusInstance';
import { STATUS_DURATIONS, STATUS_TYPES, STATUS_USAGE_FREQUENCY } from '../constants/status.constants';
import { NonConflicting } from '../helpers/type.helpers';
import { CoreEvents, EventMoment } from './generalEvents.types';


type StatusInstanceConstructor = {
    definition: StatusDefinition;
    id?: string;
    timesUsed?: number;
    valueToRecover?: Record<string, number>;
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


type StatusUsageFrequency = keyof typeof STATUS_USAGE_FREQUENCY;

interface AffectedStatDescriptor<T extends object = {}> {
    type: StatusType;
    from: keyof (NonConflicting<T, BasicStats> & BasicStats);
    to: keyof (NonConflicting<T, BasicStats> & BasicStats); // TODO comprobar este tipo
    value: number;
    id?: number;
    timesUsed?: number;
    recovers: boolean; // Indica si al acabarse el status la variación de estadísticas se devuelve.
}


interface StatusDefinition<T extends object = {}> {
    name: string;
    applyOn: EventMoment;
    duration: StatusDuration;
    usageFrequency: StatusUsageFrequency;
    statsAffected: AffectedStatDescriptor<T>[];
    onAdd?: (character: Character) => void;
    triggersOnAdd?: boolean;
    onRemove?: (character: Character) => void;
} // plantilla sin cambios (sin valueToRecover etc)


export {
    StatusDefinition,
    AffectedStatDescriptor,
    StatusDurationPermanent,
    StatusDurationTemporal,
    StatusType,
    StatusDuration,
    StatusUsageFrequency,
    StatusActivationFunction,
    StatusInstanceConstructor,
};
