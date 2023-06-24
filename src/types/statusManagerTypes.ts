import StatusManager from "../classes/StatusManager"

type StatusManagerConstructor = {
    [x in keyof StatusManager]?: StatusManager[x]
} & Record<string, any>

export {
    StatusManagerConstructor
}