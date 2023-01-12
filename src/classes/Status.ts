
import discriminators from "../constants/discriminators";
import { DEFAULT as default_status, STATUS_TYPE } from "../constants/status";
import { uniqueID } from "../helper";
import { checkDuration } from "../helper/errorControllers";
import { Stats } from "../interfaces";
import {
    IActivateReturn,
    ICalcFunction,
    Constructor,
    IDuration,
    IStatAffected,
    IStatusAppliedOn,
    IStatusConstructor,
    ITemporal,
    ITimesUsed,
} from "../interfaces/Status.Interface";
import { CharacterClass } from "./Character";

class Status {
    appliedOn: IStatusAppliedOn = default_status.appliedOn;

    character: CharacterClass;

    discriminator = discriminators.STATUS;

    duration: IDuration = {
        type: default_status.durationType
    }

    hasAlreadyBeenApplied = false;

    id: number;

    isActive = true;

    name = default_status.name;

    //if it's not ONCE, this will be the counter of the stat
    originalDuration: IDuration = { type: default_status.durationType }

    //unused
    originalStatus: Constructor;

    recovers: boolean = false;

    statsAffected: IStatAffected[] = default_status.statsAffected;

    totalStatsChanged: Partial<Stats> = default_status.totalStatsChanged;

    timesApplied: number = 0;

    whenToApply: ITimesUsed = default_status.whenToApply;

    constructor(config?: Constructor) {
        this.originalStatus = config

        const {
            id = uniqueID(),
            statsAffected,
            duration,
            ...rest
        } = config;

        this.id = id;

        Object.keys(rest).forEach(key => {
            this[key] = rest[key]
        })
        //
        this.statsAffected = statsAffected.map(stat => {
            let solution = stat
            solution.id = uniqueID();
            solution.source = solution.source ? solution.source : "stats"
            return solution;
        })

        this.addDuration(duration);
    }

    /**
    * 
    * @returns 
    */
    activate: () => IActivateReturn = () => {
        const ACTION = {
            [STATUS_TYPE.BUFF_FIXED]: this.loadBuffFixed,
            [STATUS_TYPE.BUFF_PERCENTAGE]: this.loadBuffPercentage,
            [STATUS_TYPE.DEBUFF_FIXED]: this.loadDebuffFixed,
            [STATUS_TYPE.DEBUFF_PERCENTAGE]: this.loadDebuffPercentage,
        };

        let finalSolution = {
            statsAffected: this.statsAffected,
            value: {},
            statusLastExecution: false, //TODO_ corregir. poco descriptivo
        };

        //clausula de guarda
        if (!this.character.isAlive) {
            return finalSolution
        }

        const execute = () => {
            this.hasAlreadyBeenApplied = true;
            this.timesApplied += 1;

            let executionSolution = []

            this.statsAffected.forEach(({ type, from, to, value, source, recovers, ...rest }, i) => {
                //ACTION[stat.type] is a unction loaded with an object
                let statusSolution = ACTION[type]({
                    from: this.character[source][from],
                    to: this.character[source][to],
                    operator: value
                });

                //updates Character Stat "to" with the solution.
                this.character.setStat(to, statusSolution.solution);

                //Stored in the global changes variable
                if (!this.totalStatsChanged[to]) this.totalStatsChanged[to] = 0;
                this.totalStatsChanged[to] += statusSolution.operator;

                //added Solution Value to the stat changed.
                if (!finalSolution.value[to]) finalSolution.value[to] = 0
                finalSolution.value[to] += this.character[source][to] //

                //added one time used.
                this.statsAffected[i].timesUsed++

                if (rest)
                    finalSolution = { ...finalSolution, ...rest }
            });

            finalSolution.statusLastExecution = !Boolean(this.isActive);
            return executionSolution
        }

        //The 4 cases are explicit to let me retake this in the future and not to die trying to understand it
        if (this.duration.type === 'PERMANENT' && this.whenToApply === 'PER_ACTION') {
            execute()
        } else if (this.duration.type === 'PERMANENT' && (this.whenToApply === 'ONCE' && this.hasAlreadyBeenApplied === false)) {
            execute()
        } else if (this.duration.type === 'TEMPORAL' && this.duration.value > 0) {
            this.addDuration({ value: this.duration.value - 1, type: 'TEMPORAL' } as ITemporal);
            if (this.whenToApply === 'PER_ACTION') {
                execute()
            } else if (this.whenToApply === 'ONCE' && this.hasAlreadyBeenApplied === false) { 
                execute()
            }
        }

        return finalSolution;
    };

    /**
    * sets duration type and if type is "TEMPORAL"
    * value is setted too. 
    * checks if isActive if value <= 0.
    * @param duration.type PERMANENT" | "TEMPORAL"
    * @param duration.value number
    */
    addDuration = (duration: IDuration) => {

        if (duration.type === "TEMPORAL") {
            this.duration = {
                type: duration.type,
                value: duration.value === undefined ? 1 : duration.value >= 0 ? duration.value : 0 //if not value, = 1, else if value >= 0 value, else 0
            }
            this.setIsActive(this.duration.value > 0);
        } else {
            this.duration = duration
        }
    };

    /**
     * @param newStat to be added
     */
    addStatAffected = (newStat: IStatAffected) => {
        newStat.id = uniqueID()
        newStat.source = newStat.source ? newStat.source : "stats"
        this.statsAffected.push(newStat)
    }

    /**
     * @param newStat[] to be added
     */
    addStatsAffected = (newStat: IStatAffected[]) => {
        this.statsAffected = this.statsAffected.concat(newStat.map(stat => {
            let solution = stat
            solution.id = uniqueID();
            solution.source = solution.source ? solution.source : "stats"
            return solution;
        }))
    }

    /**
     * 
     * @param arg: { to, from, operator } & { [x:string]: any } 
     * @param from: origin of the data
     * @param to: source to the data
     * @param operator: raw number to add
     * @param rest: ...any
     * @returns { solution: number, operator: number }
     ** solution is the ecuation result.
     ** operator is the multiplier used.
     */
    loadBuffFixed: ICalcFunction = ({ from, to, operator }) => {
        return {
            solution: to + operator,
            operator: operator,
        };
    };

    /**
    * 
    * @param arg: { to, from, operator } & { [x:string]: any } 
    * @param from: origin of the data
    * @param to: source to the data
    * @param operator: raw multiplier
    * @param rest: ...any
    * @returns { solution: number, operator: number }
    ** solution is the ecuation result.
    ** operator is the multiplier used.
    */
    loadBuffPercentage: ICalcFunction = ({ from, to, operator }) => {
        return {
            solution: to + from * (operator / 100),
            operator: from * (operator / 100),
        };
    };

    /**
    * 
    * @param arg: { to, from, operator } & { [x:string]: any } 
    * @param from: origin of the data
    * @param to: source to the data
    * @param operator: raw number to substract
    * @param rest: ...any
    * @returns { solution: number, operator: number }
    ** solution is the ecuation result.
    ** operator is the multiplier used.
    */
    loadDebuffFixed: ICalcFunction = ({ from, to, operator }) => {
        return {
            solution: to - operator,
            operator: -operator,
        };
    };

    /**
    * 
    * @param arg: { to, from, operator } & { [x:string]: any } 
    * @param arg.from: origin of the data
    * @param arg.to: source to the data
    * @param arg.operator: raw number to divide for
    * @param arg.rest: ...any /unused.
    * @returns { solution: number, operator: number }
    ** solution is the ecuation result.
    ** operator is the multiplier used.
    */
    loadDebuffPercentage: ICalcFunction = ({ from, to, operator }) => {
        return {
            solution: to - from * (operator / 100),
            operator: -(from * (operator / 100)),
        };
    };

    /**
     * executed when Status is adden on the status manager
     */
    onAdd() { }

    /**
     * executed when Status is removed on the status manager
     */
    onRemove() { }

    /**
    * revert stats changed if stat.recovers === true
    */
    recoverStats() {
        this.statsAffected.forEach((stat) => {
            if (stat.recovers) {
                this.character.stats[stat.to] += -this.totalStatsChanged[stat.to];
            }
        });
    }

    /**
    *   Resets Status value by default.
    ** each originalStatus is set to che object
    ** reset duration
    ** if whenToApply === ONCE, hasAlreadyBeenApplies = false
    ** else (whenToApply === TEMPORAL), originalDurationValue resetted.
    */
    resetStatus() {
        //set all properties in originalStatus in the class
        for (let key in this.originalStatus) {
            this[key] = this.originalStatus[key]
        }
        this.timesApplied = 0;
        this.addDuration(this.originalStatus.duration);

        if (this.whenToApply === "ONCE") {
            this.hasAlreadyBeenApplied = false;
        }


    }

    setCharacter(c: CharacterClass) {
        this.character = c;
    }

    /**
     * Sets isActivate, if false recovers character stats.
     * @param value activation
     */
    setIsActive(value: boolean) {
        this.isActive = value;
    }

}

export default Status

