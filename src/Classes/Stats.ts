import { DEFAULT_STATS } from '../constants/stats.constants';
import { lifeCheckHelper } from '../helpers/common.helpers';
import { fromPropsToModifiers } from '../helpers/stats.helpers';
import { NonConflicting, Widen } from '../helpers/type.helpers';
import { ModificationKeys } from '../types/common.types';
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
    hpAndTotalHpClamped?: boolean;
} & Partial<NonConflicting<TProps, BasicStats>>;


/**
 * Gestiona estadisticas.
 * Las almacena, devuelve y contiene los modificadores.
 */

export class Stats<TProps extends object = any> { //TODO: <T extends { [K in keyof T]: number }> 
    private _prop: BasicStats & Record<AnyStat, number>; //todo: Widen<NonConflicting<T, BasicStats>> & BasicStats

    private statModifier?: StatsModifiers;
    hpAndTotalHpClamped?: boolean;

    constructor(params?: Partial<StatsConstructor<TProps>>) {
        if (!params) params = {};
        const { totalHp = DEFAULT_STATS.totalHp, hp = DEFAULT_STATS.hp, statModifier, hpAndTotalHpClamped = false, ...restData } = params;

        const procesedProps = Object.assign({ ...DEFAULT_STATS },
            {
                ...restData,
                ...lifeCheckHelper({ hp, totalHp, clamped: hpAndTotalHpClamped }),
            },
        );

        this._prop = procesedProps;
        this.hpAndTotalHpClamped = hpAndTotalHpClamped;
        this.statModifier = statModifier ?? new StatsModifiers({
            modifiers: fromPropsToModifiers(procesedProps)
        });
    }

    private setHp(newHp: number) {

        this._prop.isAlive = newHp > 0 ? 1 : 0;
        this._prop.hp = lifeCheckHelper({
            hp: newHp,
            totalHp: this._prop.totalHp,
            clamped: this.hpAndTotalHpClamped,
        }).hp;
    }

    getProp(stat: AnyStat): number {
        if (!this._prop[stat] && this._prop[stat] !== 0) {
            throw new Error(`Stat ${stat} does not exist on Stats.`);
        };

        let originalValue = this._prop[stat];

        /*
        
        */
        // let modifiedValue = this.statModifier?.getModifier(stat, 'procesedStat');

        return originalValue;
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
    addModifier(stat: AnyStat, type: ModificationKeys, value: number) {
        if (!this.statModifier) {
            this.statModifier = new StatsModifiers();
        };

        const previousValue = this.statModifier.getModifier(stat, type);

        this.statModifier.setModifier(stat, type, previousValue + value);
        this.setProp(stat, this.statModifier.processProcessedStats(stat));
    }

    substractModifier(stat: AnyStat, type: ModificationKeys, value: number) {
        if (!this.statModifier) {
            this.statModifier = new StatsModifiers();
        };

        const previousValue = this.statModifier.getModifier(stat, type);

        this.statModifier.setModifier(stat, type, previousValue - value);
        this.setProp(stat, this.statModifier.processProcessedStats(stat));
    };

    /** Elimina un modificador concreto */
    revert(stat: AnyStat, type: ModificationKeys, value: number) {
        if (!this.statModifier) {
            return;
        }
        const currentValue = this.statModifier.getModifier(stat, type);
        this.statModifier.setModifier(stat, type, currentValue - value);
    }

    getStatsModifiers(): StatsModifiers | undefined {
        return this.statModifier;
    }

    /**
     * Devuelve todas las estadísticas actuales.
     */
    toJSON() {
        return { ...this._prop };
    }
}
