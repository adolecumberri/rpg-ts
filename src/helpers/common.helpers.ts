import { DEFAULT_STATS } from '../constants/stats.constants';


function uniqueID() {
    return String(Math.floor(Math.random() * Math.floor(Math.random() * Date.now())));
}

// this function creates a funcion to create default objects.
const createDefaultObjectGetter = <T>(defaultObject: T) => (param?: Partial<T>): T => {
    return { ...defaultObject, ...param };
};

function getRandomInt(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min) + min);
}

/*
encapsulates adding HP and totalHP check logic.
*/
function lifeCheckHelper({ hp = 0, totalHp = 0 }: { hp?: number; totalHp?: number }) {
    const newTotalHp = totalHp ?
        Math.max(
            totalHp ?? DEFAULT_STATS.totalHp,
            hp ?? DEFAULT_STATS.hp,
        ) :
        DEFAULT_STATS.totalHp;

    const newHp = Math.max(0, Math.min(hp, totalHp));
    return {
        hp: newHp,
        isAlive: newHp > 0 ? 1 : 0,
        totalHp: newTotalHp,
    };
}

export {
    createDefaultObjectGetter,
    getRandomInt,
    uniqueID,
    lifeCheckHelper,
};
