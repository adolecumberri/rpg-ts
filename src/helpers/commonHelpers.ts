
const createDefaultObjectGetter = <T>(defaultObject: T) => (param?: Partial<T>): T => {
    return { ...defaultObject, ...param };
};

function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

function uniqueID() {
    return Math.floor(Math.random() * Math.floor(Math.random() * Date.now()));
}

export {
    createDefaultObjectGetter,
    getRandomInt,
    uniqueID
}