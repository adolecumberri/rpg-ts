import { EventMoment } from "../types/generalEvents.types";

/* eslint-disable space-before-function-paren */
export type EventHandler = (...args: any[]) => void;

export interface EventEmitter {
    on(event: EventMoment, listener: EventHandler): void; // setter
    emit(event: EventMoment, ...args: any[]): void; // trigger
}

export interface EventEmitterLike {
    emit(event: EventMoment, ...args: any[]): void;
}

export function createEventEmitter(): EventEmitter {
    const listeners: Partial<Record<EventMoment, EventHandler[]>> = {};

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
    { emitter, methodName, fn }: {
        emitter?: EventEmitterLike,
        methodName: EventMoment,
        fn: T
    },
): T {
    if (!emitter && methodName && fn) {
        return ((...args: Parameters<T>): ReturnType<T> => {
            return fn(...args);
        }) as T;
    }

    if (!emitter || !methodName || !fn) {
        throw new Error('wrapWithEvents requires emitter, methodName, and fn parameters');
    }
    return ((...args: Parameters<T>): ReturnType<T> => {
        emitter.emit(`before_${methodName}`, ...args);
        const result = fn(...args);
        emitter.emit(`after_${methodName}`, result, ...args);
        return result;
    }) as T;
};
