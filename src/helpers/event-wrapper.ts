/* eslint-disable space-before-function-paren */
export type EventHandler = (...args: any[]) => void;

export interface EventEmitter {
    on(event: string, listener: EventHandler): void;
    emit(event: string, ...args: any[]): void;
}

export function createEventEmitter(): EventEmitter {
    const listeners: Record<string, EventHandler[]> = {};

    return {
        on(event, listener) {
            (listeners[event] ??= []).push(listener);
        },
        emit(event, ...args) {
            (listeners[event] || []).forEach((fn) => fn(...args));
        },
    };
};

/*
    * Wraps a function with event triggers before and after its execution.
    * Emits 'before_<methodName>' before calling the function and 'after_<methodName>' after it.
*/
export function wrapWithEvents<
    T extends (...args: any[]) => any
>(
    emitter: EventEmitter,
    methodName: string,
    fn: T,
): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
        emitter.emit(`before_${methodName}`, ...args);
        const result = fn(...args);
        emitter.emit(`after_${methodName}`, result, ...args);
        return result;
    }) as T;
};
