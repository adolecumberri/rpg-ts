import { CharacterClass } from "../classes/Character";
import IStatus from "../classes/Status";
import discriminators from "../constants/discriminators";
import { STATUS_DURATIONS, STATUS_SOURCE, STATUS_WHEN_TO_APPLY } from '../constants/status'
import { Stats } from "./Character.interface";

type IMyStatus<T extends object> = T & {
    [x in keyof IStatus]: IStatus[x]
}

type IStatusConstructor = {
    new <T extends object>(arg: T): IMyStatus<T>
}

type statusType = "BUFF_FIXED" | "BUFF_PERCENTAGE" | "DEBUFF_FIXED" | "DEBUFF_PERCENTAGE"

type IStatusAppliedOn =
    | "AFTER_ADD_STATUS"
    | "AFTER_ATTACK"
    | "AFTER_DEFENCE"
    | "AFTER_DIE"
    | "AFTER_REMOVE_STATUS"
    | "AFTER_TURN"
    | "BEFORE_ADD_STATUS"
    | "BEFORE_ATTACK"
    | "BEFORE_DEFENCE"
    | "BEFORE_DIE"
    | "BEFORE_REMOVE_STATUS"
    | "BEFORE_TURN";

type IStatusAppliedOnObject = {
    [x in IStatusAppliedOn]: IStatusAppliedOn
}

type IStatusType = {
    [x in statusType]: statusType
}

interface IPermanent {
    type: typeof STATUS_DURATIONS.PERMANENT
}
interface ITemporal {
    type: typeof STATUS_DURATIONS.TEMPORAL;
    value?: number;
}

type IDuration = IPermanent | ITemporal

interface IStatAffected extends Record<string, any> {
    type: statusType;
    from: keyof Stats;
    to: keyof Stats;
    value: number;
    source?: typeof STATUS_SOURCE.STATS | typeof STATUS_SOURCE.ORIGIN_STATS;
    id?: number;
    timesUsed?: number,
    recovers?: boolean
}

interface IActivateReturn extends Record<string, any> {
    statsAffected: IStatAffected[];
    value: {};
    statusLastExecution: boolean
}

type ITimesUsed = typeof STATUS_WHEN_TO_APPLY.ONCE | typeof STATUS_WHEN_TO_APPLY.PER_ACTION;

type Constructor = Partial<{
    appliedOn: IStatusAppliedOn;
    character: CharacterClass;
    // discriminator: discriminators.STATUS;
    duration: IDuration;
    hasAlreadyBeenApplied: boolean;
    id: number;
    isActive: boolean;
    name: string;
    // originalDurationValue: number;
    // originalStatus: Constructor;
    statsAffected: IStatAffected[];
    // totalStatsChanged: Partial<Stats>;
    // totalTimesApplied: number;
    whenToApply: ITimesUsed;
    // activate: () => IActivateReturn;
    // addDuration: (duration: IDuration) => void;
    // loadBuffFixed: ICalcFunction;
    // loadBuffPercentage: ICalcFunction;
    // loadDebuffFixed: ICalcFunction;
    // loadDebuffPercentage: ICalcFunction;
    // onAdd: () => void;
    // onRemove: () => void;
    recovers: boolean
    // recoverStats: () => void;
    // resetStatus: () => void;
    // setCharacter: (c: CharacterClass) => void;
    // setIsActive: (value: boolean) => void;
}> & Record<string, any>

type ICalcFunction = (arg?: { from: number, to: number, operator: number } & Record<string, any>) => { solution: number, operator: number }

export {
    IStatusConstructor,
    IStatusAppliedOn,
    IStatusAppliedOnObject,
    IStatusType,
    IDuration,
    ITemporal,
    IPermanent,
    IStatAffected,
    ITimesUsed,
    Constructor,
    ICalcFunction,
    IActivateReturn
};
