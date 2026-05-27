import { STATUS_DURATIONS, STATUS_USAGE_FREQUENCY } from "../constants/status.constants";
import { EventMoment } from "../types/generalEvents.types";
import { Character } from "./Character";
import { AnyStat } from "./Stats";
import { ModificationKeys } from "./StatsModifier";

type StatusInstanceConstructor = {
    definition: StatusDefinition;
    id?: string;
    timesUsed?: number;
    timesTriggered?: number;
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
    initialValue: number;
    variation: number;
});

type StatusDuration = StatusDurationPermanent | StatusDurationTemporal;


type StatusUsageFrequency = keyof typeof STATUS_USAGE_FREQUENCY;

interface AffectedStatDescriptor {
    typeOfModification: ModificationKeys;
    from: AnyStat,//TODO: keyof (NonConflicting<T, BasicStats> & BasicStats);
    to: AnyStat, //Todo: keyof (NonConflicting<T, BasicStats> & BasicStats); // TODO comprobar este tipo
    value: number;
    id?: number | string;
    timesUsed?: number;
    recovers: boolean; // Indica si al acabarse el status la variación de estadísticas se devuelve.
}


interface StatusDefinition {
    name: string;
    applyOn: EventMoment;
    duration: StatusDuration;
    usageFrequency: StatusUsageFrequency;
    statsAffected: AffectedStatDescriptor[];
    onAdd?: (character: Character) => void;
    triggersOnAdd?: boolean;
    onRemove?: (character: Character) => void;
} // plantilla sin cambios (sin valueToRecover etc)

export {
    StatusDefinition,
    AffectedStatDescriptor,
    StatusDurationPermanent,
    StatusDurationTemporal,
    StatusDuration,
    StatusUsageFrequency,
    StatusActivationFunction,
    StatusInstanceConstructor,
};
