import {StatusManager} from '../classes';

type StatusManagerConstructor = {
    [x in keyof StatusManager]?: StatusManager[x]
}

export {
  StatusManagerConstructor,
};
