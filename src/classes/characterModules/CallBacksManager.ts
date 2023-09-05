import { CallbackParams, CharacterCallbacks } from '../../types';

class CallBacksManager {
    cb: {[x in keyof CharacterCallbacks]?: CharacterCallbacks[x][]} = {};

    constructor(args?: Partial<CallBacksManager>) {
        args && Object.assign(this, args);
    }

    addCallback<T extends keyof CharacterCallbacks>(key: T, callback: CharacterCallbacks[T]) {
        if (!this.cb[key]) this.cb[key] = [];
        this.cb[key].push(callback);
    }

    serialize() {
        return JSON.stringify(this.cb);
    }

    static deserialize(data) {
        const callBacksManager = new CallBacksManager();
        callBacksManager.cb = JSON.parse(data);
        return callBacksManager;
    }

    removeCallback<T extends keyof CharacterCallbacks>(key: T, callback: CharacterCallbacks[T]) {
        if (!this.cb[key]) return;
        this.cb[key] = this.cb[key].filter((cb) => cb !== callback) as any; // I dont know how to prevent this error.
    }

    useCallback<T extends keyof CharacterCallbacks>(key: T, params: CallbackParams) {
        if (!this.cb[key]) return;

        this.cb[key].forEach((cb) => cb(params));
    }
}

export {
    CallBacksManager,
};
