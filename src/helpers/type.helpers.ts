

type Widen<T> = { [K in keyof T]: T[K] };

type NonConflicting<T, U> = {
    [K in Exclude<keyof T, keyof U>]: T[K];
};


export {
    Widen,
    NonConflicting,
};
