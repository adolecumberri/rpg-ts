import { ModificationTypes } from "../constants/stats.constants";
import { ACTION_HANDLER, STATUS_DURATIONS, STATUS_USAGE_FREQUENCY } from "../constants/status.constants";
import { uniqueID } from "../helpers/common.helpers";
import { EventMoment } from "../types/generalEvents.types";
import { Character } from "./Character";
import { CombatTrigger } from "./Combat/Combat.interfaces";
import { AnyStat, Stats } from "./Stats";

export type StatusInstanceConstructor = {
    definition: StatusDefinition;
    id?: string;
    timesUsed?: number;
    timesTriggered?: number;
}

export interface StatusDurationPermanent {
    type: typeof STATUS_DURATIONS.PERMANENT;
}

export interface StatusDurationTemporal {
    type: typeof STATUS_DURATIONS.TEMPORAL;
    value?: number;
}

//TODO: pending to check
export type StatusActivationFunction = (arg: {
    from: number,
    to: number,
    value: number,
    modificationType: ModificationTypes,// TODO: reconsider
}) => ({
    finalValue: number,
    initialValue: number;
    variation: number;
});

export type StatusDuration = StatusDurationPermanent | StatusDurationTemporal;


export type StatusUsageFrequency = keyof typeof STATUS_USAGE_FREQUENCY;

export interface AffectedStatDescriptor {
    typeOfModification: ModificationTypes;
    from: AnyStat,
    to: AnyStat,
    value: number;
    id?: number | string;
    timesUsed?: number;
}


export interface StatusDefinition {
    name: string;
    applyOn: EventMoment;
    duration: StatusDuration;
    usageFrequency: StatusUsageFrequency;
    statsAffected: AffectedStatDescriptor[];
    // triggers?: CombatTrigger[]; //TODO: create trigger base actions
    triggersOnAdd?: boolean;
    onAdd?: (character: Character) => void;
    onRemove?: (character: Character) => void;
}


export class StatusInstance {
    id: string = uniqueID();
    definition: StatusDefinition;
    timesTriggered: number = 0;
    timesUsed: number = 0;

    constructor(config: StatusInstanceConstructor) {
        this.definition = config.definition;
        this.id = config.id ?? uniqueID();
        this.timesTriggered = config.timesTriggered ?? 0;
        this.timesUsed = config.timesUsed ?? 0;

        if (config.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            this.definition.duration = { ...config.definition.duration };
        }
    }

    /*
    */
    triggerInstances(stats: Stats): void {
        this.timesTriggered++;

        // Si no se puede activar, solo reducimos duración si es temporal y salimos
        if (!this.canActivate() && this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            (this.definition.duration as StatusDurationTemporal).value = ((this.definition.duration as StatusDurationTemporal).value ?? 0) - 1;
            return;
        };

        // aqui abajo se asume que:
        // es activable
        // puede ser temporal o permanente.

        // stat Affected es AffectedStatDescriptor
        for (const statAffectedDescriptor of this.definition.statsAffected) {

            if (!stats[statAffectedDescriptor.from as keyof Stats] || !stats[statAffectedDescriptor.to as keyof Stats]) {
                console.warn(`Stat "${statAffectedDescriptor.from}" or "${statAffectedDescriptor.to}" not found in stats object. Skipping status effect application.`);
                continue;
            }

            const result = ACTION_HANDLER({
                from: stats[statAffectedDescriptor.from as keyof Stats] as number,
                to: stats[statAffectedDescriptor.to as keyof Stats] as number,
                value: statAffectedDescriptor.value,
                modificationType: statAffectedDescriptor.typeOfModification,
            });

            // if the desc.type is percentage and "from" is diferent from "To", the variation after calculation
            // is fixed, no a percentage anymore.


            // Aplica el cambio
            stats.statsModifier?.setModifier(statAffectedDescriptor.to, statAffectedDescriptor.typeOfModification, Math.abs(result.variation));

        }

        // Reducir duración temporal si aplica
        if (this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            this.definition.duration.value = (this.definition.duration.value ?? 0) - 1;
        }
        this.timesUsed++;
    }


    /** devuelve true si se puede activar según duration/usage rules */
    canActivate(): boolean {
        const { type, } = this.definition.duration;

        // Temporal
        if (type === STATUS_DURATIONS.TEMPORAL) {
            // Si es de uso único, solo activar si timesUsed === 0
            if (this.definition.usageFrequency === 'ONCE' && this.hasBeenUsed()) {
                return false;
            }

            //asumo que usageFrequency es PER_ACTION
            return ((this.definition.duration as StatusDurationTemporal).value ?? 0) > 0;
        } else if (type === STATUS_DURATIONS.PERMANENT) {
            if (this.definition.usageFrequency === 'PER_ACTION') return true;
            if (this.definition.usageFrequency === 'ONCE') return this.timesUsed === 0;
            return false;
        }

        return false;
    }

    hasBeenUsed(): boolean {
        return this.timesUsed > 0;
    }

    isExpired(): boolean {
        const { type } = this.definition.duration;

        if (type === STATUS_DURATIONS.PERMANENT) return false;

        if (type === STATUS_DURATIONS.TEMPORAL) {
            const value = this.definition.duration.value ?? 0;

            // Expirado si la duración llega a 0 o si es ONCE y ya se usó
            if (this.definition.usageFrequency === 'ONCE') {
                return this.hasBeenUsed() && value === 0;
            }

            return value === 0;
        }

        return true;
    }
}

