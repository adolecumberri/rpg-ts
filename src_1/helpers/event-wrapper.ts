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

/*
    * Creates a simple event emitter that allows registering listeners and emitting events.
        * Listeners are stored in a dictionary where the key is the event name and the value is an array of listener functions.
        * The 'on' method is used to register a listener for a specific event, while the 'emit' method triggers all listeners associated with that event, passing any provided arguments to them.
        * This implementation is basic and does not include features like 
        * once-only listeners, 
        * removing listeners, or handling edge cases such as emitting events with no listeners. 
        * It serves as a simple utility for event-driven programming within the context of the Character class or other parts of the application.
        * Example usage:
        * const emitter = createEventEmitter();
        * emitter.on('before_attack', (attacker, target) => {
        *   console.log(`${attacker.name} is about to attack ${target.name}`);
        * });
        * emitter.emit('before_attack', characterA, characterB);
        * This would log: "CharacterA is about to attack CharacterB" when the 'before_attack' event is emitted.
*/
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
