import { uniqueID } from '../common/common.helpers';
import { Character } from './character';
import { STATUS_DURATIONS, STATUS_TYPES, STATUS_USAGE_FREQUENCY } from './Status/status.constants';
import { getDefaultStatus } from './Status/status.helper';
import { AffectedStatDescriptor,
    StatusActivationFunction,
    StatusApplicationMoment,
    StatusConstructor,
    StatusDuration,
    StatusDurationTemporal,
    StatusUsageFrequency,
} from './Status/status.types';


class Status <T extends object = {}> {
    applyOn: StatusApplicationMoment;
    duration: StatusDuration;
    hasBeenUsed?: boolean;
    id: number = uniqueID();
    statsAffected: AffectedStatDescriptor[];
    name: string = '';
    onAdd?: (character: Character) => void;
    onRemove?: (character: Character) => void;
    /**
     * Frecuencia de uso del status.
     * ONCE - Se aplica una vez y no se vuelve a aplicar.
     * PER_ACTION - Se aplica cada vez que se activa.
     */
    usageFrequency: StatusUsageFrequency;

    constructor(con?: StatusConstructor<T>) {
        Object.assign(this, getDefaultStatus(), con, { id: uniqueID() });
    }

    activate(character: Character) {
        const ACTION = {
            [STATUS_TYPES.BUFF_FIXED]: this.loadBuffFixed,
            [STATUS_TYPES.BUFF_PERCENTAGE]: this.loadBuffPercentage,
            [STATUS_TYPES.DEBUFF_FIXED]: this.loadDebuffFixed,
            [STATUS_TYPES.DEBUFF_PERCENTAGE]: this.loadDebuffPercentage,
        };

        const isPermanentAndPerAction =
        this.duration.type === STATUS_DURATIONS.PERMANENT &&
        this.usageFrequency === STATUS_USAGE_FREQUENCY.PER_ACTION;

        const isPermanentAndOnce =
        this.duration.type === STATUS_DURATIONS.PERMANENT &&
        this.usageFrequency === STATUS_USAGE_FREQUENCY.ONCE &&
        !this.hasBeenUsed;

        const isTemporalAndValid = this.duration.type === STATUS_DURATIONS.TEMPORAL && (this.duration.value ?? 0) > 0;

        const isUsageFrequencyValid =
        this.usageFrequency === STATUS_USAGE_FREQUENCY.PER_ACTION ||
        (this.usageFrequency === STATUS_USAGE_FREQUENCY.ONCE && !this.hasBeenUsed);

        if (isPermanentAndPerAction || isPermanentAndOnce || isTemporalAndValid || isUsageFrequencyValid) {
            for (const stat of this.statsAffected) {
                const action = ACTION[stat.type];
                const result = action({
                    from: character.stats[stat.from],
                    to: character.stats[stat.to],
                    value: stat.value,
                });

                // Actualizar las estadísticas del personaje
                character.stats[stat.to] = result.finalValue;

                // Guardar el valor aplicado para el recovery
                stat.valueToRecover = result.appliedValue;
            }

            if (isTemporalAndValid) {
                (this.duration as StatusDurationTemporal).value!--;
            }
        }
    }

    loadBuffFixed: StatusActivationFunction = ({ to, value }) => ({
        finalValue: to + value,
        appliedValue: value,
    });

    loadBuffPercentage: StatusActivationFunction = ({ from, to, value }) => ({
        finalValue: to + from * (value / 100),
        appliedValue: from * (value / 100),

    });

    loadDebuffFixed: StatusActivationFunction = ({ to, value }) => ({
        finalValue: to - value,
        appliedValue: -value,

    });

    loadDebuffPercentage: StatusActivationFunction = ({ from, to, value }) => ({
        finalValue: to - from * (value / 100),
        appliedValue: -(from * (value / 100)),
    });

    recover(character: Character) {
        for (const stat of this.statsAffected) {
            if (stat.recovers) {
                character.stats[stat.to] -= (stat.valueToRecover ?? 0);
            }
        }
    }
}

export default Status;

export {
    Status,
};
