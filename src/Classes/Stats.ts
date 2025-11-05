import { DEFAULT_STATS } from '../constants/stats.constants';
import { lifeCheckHelper } from '../helpers/common.helpers';
import { fromPropsToModifiers } from '../helpers/stats.helpers';
import { NonConflicting, Widen } from '../helpers/type.helpers';
import { ModificationsType } from '../types/common.types';
import { AnyStat, StatModifier, StatModifierType } from '../types/stats.types';
import { StatsModifiers } from './stats/StatsModifiers';

export type BasicStats = {
    attack: number;
    defence: number;
    isAlive: number;
    totalHp: number;
    hp: number;
};

type StatsConstructor<TProps> = {
    statModifier?: StatsModifiers;
    attack?: number;
    defence?: number;
    isAlive?: number;
    totalHp?: number;
    hp?: number;
} & Partial<NonConflicting<TProps, BasicStats>>;


/**
 * Gestiona estadisticas.
 * Las almacena, devuelve y contiene los modificadores.
 */

export class Stats<TProps extends object = any> { //TODO: <T extends { [K in keyof T]: number }> 
    private _prop: BasicStats & Record<AnyStat, number>; //todo: Widen<NonConflicting<T, BasicStats>> & BasicStats

    private statModifier?: StatsModifiers;

    constructor(params?: Partial<StatsConstructor<TProps>>) {
        if (!params) params = {};
        const { totalHp, hp, statModifier, ...restData } = params;

        const procesedProps = Object.assign({ ...DEFAULT_STATS },
            {
                ...restData,
                ...lifeCheckHelper({ hp, totalHp }),
            },
        );

        this._prop = procesedProps;

        this.statModifier = statModifier ?? new StatsModifiers({
            modifiers: fromPropsToModifiers(procesedProps)
        });
    }

    private setHp(newHp: number) {
        this._prop.isAlive = newHp > 0 ? 1 : 0;
        this._prop.hp = Math.min(this._prop.totalHp, Math.max(0, newHp));
    }

    getProp(stat: AnyStat): number {
        if (!this._prop[stat]) {
            throw new Error(`Stat ${stat} does not exist on Stats.`);
        };

        let originalValue = this._prop[stat];

        let modifiedValue = this.statModifier?.getModifier(stat, 'procesedStat');

        return modifiedValue ?? originalValue;
    }


    setProp(
        key: AnyStat,
        value: number,
    ) {
        if (key === 'hp') {
            this.setHp(value as number);
        } else {
            this._prop[key] = value;
        }
    }

    /** Añade un modificador fijo o porcentual */
    addModifier(stat: AnyStat, type: ModificationsType, value: number) {
        if (!this.statModifier) {
            this.statModifier = new StatsModifiers();
        }
        this.statModifier.setModifier(stat, type, value, this.getProp(stat));
    }

    substractModifier(stat: AnyStat, type: ModificationsType, value: number) {
        if (!this.statModifier) {
            throw new Error('No StatModifier instance available.');
            return;
        }
        const currentValue = this.statModifier.getModifier(stat, type);
        this.statModifier.setModifier(stat, type, currentValue - value, this.getProp(stat));
    };

    /** Elimina un modificador concreto */
    revert(stat: AnyStat, type: ModificationsType, value: number) {
        if (!this.statModifier) {
            return;
        }
        const currentValue = this.statModifier.getModifier(stat, type);
        this.statModifier.setModifier(stat, type, currentValue - value, this.getProp(stat));
    }

    /**
     * Devuelve todas las estadísticas actuales.
     */
    toJSON() {
        return { ...this._prop };
    }
}
