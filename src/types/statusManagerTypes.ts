import {BaseStatusManager, StatusManager} from '../classes';

type StatusManagerConstructor = {
    [x in keyof BaseStatusManager]?: BaseStatusManager[x]
} & Record<string, any>

type DynamicStatusManagerConstructor = {
    new <T extends object>(arg?: T): T & {
        [x in keyof BaseStatusManager]: BaseStatusManager[x]
    }
}

export {
  StatusManagerConstructor,
  DynamicStatusManagerConstructor
};
