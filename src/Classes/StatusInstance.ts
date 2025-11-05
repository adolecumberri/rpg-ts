import { uniqueID } from '../helpers/common.helpers';
import { STATUS_DURATIONS } from '../constants/status.constants';
import { Stats } from './Stats';
import { StatusDefinition, StatusDurationTemporal, AffectedStatDescriptor, StatusInstanceConstructor } from '../types/status.types';
import { ACTION_HANDLERS } from '../helpers/status.helper';
import { Character } from './Character';

type AffectedStatInstance = {
    id: string;
    descriptor: AffectedStatDescriptor;
    accumulated: number; // acumulado para recovery (puede ser negativo para debuffs)
};

export class StatusInstance {
    readonly definition: StatusDefinition; // los datos fijos
    readonly id: string = uniqueID();

    timesTriggered = 0; // lanzado el trigger
    timesUsed = 0;  // aunque lanzado, si no se aplicó (duración/uso) no cuenta
    private _affected: AffectedStatInstance[] = [];

    constructor(config: StatusInstanceConstructor) {
        this.definition = config.definition;
        this.id = config.id ?? uniqueID();
        this.timesTriggered = config.timesTriggered ?? 0;
        this.timesUsed = config.timesUsed ?? 0;

        if (config.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            this.definition.duration = { ...config.definition.duration };
        }

        // Creamos una instancia por cada affected stat, con su propia id y acumulador
        this._affected = config.definition.statsAffected.map((desc) => ({
            id: uniqueID(),
            descriptor: { ...desc }, // clonamos para evitar modificar la definición global
            accumulated: 0,
        } as AffectedStatInstance));
    }

    // TODO: si tienes que revertir el arg stats por uno de character...
    // TODO: apunta el por qué
    triggerInstances(stats: Stats): void {
        this.timesTriggered++;

        if (!this.canActivate()) {
            if (this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
                this.definition.duration.value = (this.definition.duration.value ?? 0) - 1;
            }
            return;
        };

        for (const affected of this._affected) {
            const desc = affected.descriptor;

            const action = ACTION_HANDLERS[desc.type];
            const result = action({
                from: stats.getProp(desc.from),
                to: stats.getProp(desc.to),
                value: desc.value,
            });

            // Aplica el cambio
            stats.addModifier(desc.to, desc.type, result.initialValue);
            stats.setProp(desc.to, result.finalValue);

            // Si este stat debe recuperarse, acumulamos lo aplicado para revertir luego
            if (desc.recovers) {
                affected.accumulated += (result.initialValue as number);
            }
        }

        // Reducir duración temporal si aplica
        if (this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            this.definition.duration.value = (this.definition.duration.value ?? 0) - 1;
        }
        this.timesUsed++;
    }


    /** revierte todos los acumulados por affected-stat */
    recover(stat: Stats): void {
        for (const affected of this._affected) {
            const desc = affected.descriptor;
            if (!desc.recovers) continue; // si no recupera, saltamos

            const key = desc.to;
            stat.substractModifier(key, desc.type, affected.accumulated);

            // limpiamos acumulador tras recuperar
            affected.accumulated = 0;
        }
    }

    /* 
        funciones necesarias llamar en el "onRemove".
        recover of stats
        trigger onRemove if exist
     */
    remove(character: Character): void {
        this.recover(character.stats);
        this.definition.onRemove?.(character);
    };

    /** devuelve true si se puede activar según duration/usage rules */
    canActivate(): boolean {
        const { type } = this.definition.duration;

        // Temporal
        if (type === STATUS_DURATIONS.TEMPORAL) {
            // Si es de uso único, solo activar si timesUsed === 0
            if (this.definition.usageFrequency === 'ONCE' && this.hasBeenUsed()) {
                return false;
            }
            return ((this.definition.duration as StatusDurationTemporal).value ?? 0) > 0;
        }

        // Permanent
        if (type === STATUS_DURATIONS.PERMANENT) {
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

    /** API útil para tests/depuración: devuelve snapshot de affected instances */
    getAffectedInstances() {
        return this._affected.map((a) => ({
            id: a.id,
            to: a.descriptor.to,
            accumulated: a.accumulated,
        }));
    }
}
