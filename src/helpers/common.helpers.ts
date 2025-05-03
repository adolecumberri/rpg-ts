

function uniqueID() {
    return Math.floor(Math.random() * Math.floor(Math.random() * Date.now()));
}

// this function creates a funcion to create default objects.
const createDefaultObjectGetter = <T>(defaultObject: T) => (param?: Partial<T>): T => {
    return { ...defaultObject, ...param };
};

function getRandomInt(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min) + min);
}

export {
    createDefaultObjectGetter,
    getRandomInt,
    uniqueID,
};
