import { BasicStats } from '../types';


class CharacterStats<T extends BasicStats> {
    constructor(init: T) {
        Object.assign(this as this & T, init);
    }
}

export { CharacterStats };
