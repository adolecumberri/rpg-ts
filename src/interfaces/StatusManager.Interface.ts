import StatusManager from "../classes/StatusManager"

type IMyStatus<T extends object> = T & {
    [x in keyof StatusManager]: StatusManager[x]
}

type IStatusManagerConstructor = {
    new <T extends object>(arg: T): IMyStatus<T>
}

type Constructor = {
    [x in keyof StatusManager]?: StatusManager[x]
} & Record<string, any>

export {
    IStatusManagerConstructor,
    Constructor
}