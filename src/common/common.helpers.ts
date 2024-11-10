

function uniqueID() {
    return Math.floor(Math.random() * Math.floor(Math.random() * Date.now()));
}

// this function creates a funcion to create default objects.
const createDefaultObjectGetter = <T>(defaultObject: T) => (param?: Partial<T>): T => {
    return { ...defaultObject, ...param };
};

export {
    createDefaultObjectGetter,
    uniqueID,
};
