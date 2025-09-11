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
    timesUsed: number;
};

export class StatusInstance {
    readonly definition: StatusDefinition;
    readonly id: string = uniqueID();

    timesUsed = 0;
    timesActivated = 0;
    private _affected: AffectedStatInstance[] = [];

    constructor(config: StatusInstanceConstructor) {
        this.definition = config.definition;
        this.id = config.id ?? uniqueID();
        this.timesUsed = config.timesUsed ?? 0;
        this.timesActivated = config.timesActivated ?? 0;

        if (config.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            this.definition.duration = { ...config.definition.duration };
        }

        // Creamos una instancia por cada affected stat, con su propia id y acumulador
        this._affected = config.definition.statsAffected.map((desc) => ({
            id: uniqueID(),
            descriptor: { ...desc }, // clonamos para evitar modificar la definición global
            accumulated: 0,
            timesUsed: 0,
        }));
    }

    activate(character: Character<any>): void {
        if (!this.canActivate()) {
            if (this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
                this.definition.duration.value = (this.definition.duration.value ?? 0) - 1;
            }
            this.timesActivated++;
            return;
        };

        for (const affected of this._affected) {
            const desc = affected.descriptor;

            const action = ACTION_HANDLERS[desc.type];
            const result = action({
                from: character.stats.getProp(desc.from),
                to: character.stats.getProp(desc.to),
                value: desc.value,
            });

            // Aplica el cambio
            character.setStat(desc.to, result.finalValue);

            // Si este stat debe recuperarse, acumulamos lo aplicado para revertir luego
            if (desc.recovers) {
                affected.accumulated += (result.appliedValue as number);
            }

            affected.timesUsed++;
        }

        // Reducir duración temporal si aplica
        if (this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            (this.definition.duration as StatusDurationTemporal).value!--;
        }
        this.timesActivated++;
        this.timesUsed++;
    }


    // private activateOnStats(characterStats: Stats<any>) {
    //     if (!this.canActivate()) return;

    //     for (const affected of this._affected) {
    //         const desc = affected.descriptor;

    //         const action = ACTION_HANDLERS[desc.type];
    //         const result = action({
    //             from: characterStats.getProp(desc.from),
    //             to: characterStats.getProp(desc.to),
    //             value: desc.value,
    //         });

    //         if (desc.to === 'hp') {
    //             characterStats.receiveDamage(result.appliedValue as number);
    //         } else {
    //             characterStats.setProp(desc.to, result.finalValue);
    //         }

    //         // Si este stat debe recuperarse, acumulamos lo aplicado para revertir luego
    //         if (desc.recovers) {
    //             affected.accumulated += (result.appliedValue as number);
    //         }

    //         affected.timesUsed++;
    //     }

    //     // Reducir duración temporal si aplica
    //     if (this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
    //         (this.definition.duration as StatusDurationTemporal).value!--;
    //     }

    //     this.timesUsed++;
    // }

    /** revierte todos los acumulados por affected-stat */
    recover(characterStats: Stats<any>): void {
        for (const affected of this._affected) {
            const desc = affected.descriptor;
            if (!desc.recovers) continue; // si no recupera, saltamos

            const key = desc.to;
            const current = characterStats.getProp(key) as number;
            // restamos el acumulado (si acumulado positivo => restamos ese valor)
            characterStats.setProp(key, current - affected.accumulated);
            // limpiamos acumulador tras recuperar
            affected.accumulated = 0;
        }
    }

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
            timesUsed: a.timesUsed,
        }));
    }
}
