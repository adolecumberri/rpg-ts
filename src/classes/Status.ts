import {
  AffectedStatDescriptor,
  // DynamicStatusConstructor,
  StatusActivationFunction,
  StatusApplicationMoment,
  StatusConstructor,
  StatusDuration,
  StatusDurationTemporal,
  StatusUsageFrequency,
} from '../types';
import { uniqueID, getDefaultStatus } from '../helpers';
import { Character } from './';
import { STATUS_TYPES, STATUS_DURATIONS, STATUS_USAGE_FREQUENCY } from '../constants';

class Status {
  id: number = uniqueID();
  name: string = '';
  duration: StatusDuration;
  applyOn: StatusApplicationMoment;
  usageFrequency: StatusUsageFrequency;
  statsAffected: AffectedStatDescriptor[];
  hasBeenUsed?: boolean;

  constructor(con?: StatusConstructor) {
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

    const isTemporalAndValid = this.duration.type === STATUS_DURATIONS.TEMPORAL && this.duration.value > 0;

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
        character.stats[stat.to] = result.valueFinal;

        // Guardar el valor aplicado para el recovery
        stat.valueToRecover = result.valueApplied;
      }

      if (isTemporalAndValid) {
        (this.duration as StatusDurationTemporal).value--;
      }
    }
  }

  loadBuffFixed: StatusActivationFunction = ({ to, value }) => ({
    valueFinal: to + value,
    valueApplied: value,
  });

  loadBuffPercentage: StatusActivationFunction = ({ from, to, value }) => ({
    valueFinal: to + from * (value / 100),
    valueApplied: from * (value / 100),

  });

  loadDebuffFixed: StatusActivationFunction = ({ to, value }) => ({
    valueFinal: to - value,
    valueApplied: -value,

  });

  loadDebuffPercentage: StatusActivationFunction = ({ from, to, value }) => ({
    valueFinal: to - from * (value / 100),
    valueApplied: -(from * (value / 100)),
  });

  recover(character: Character) {
    for (const stat of this.statsAffected) {
      if (stat.recovers) {
        character.stats[stat.to] -= stat.valueToRecover;
      }
    }
  }
}

// con esto evito tener que usar typeof Status cada vez que lo uso fuera.
// const Status = BaseStatus as DynamicStatusConstructor;
// type Status = InstanceType<typeof BaseStatus>

export default Status;

export {
  Status,
  // BaseStatus,
};
