type EventMap = Record<string, unknown[]>;

type Listener<TArgs extends unknown[]> = (...args: TArgs) => void;

export class EventEmitter<TEvents extends EventMap> {
    private listeners: {
        [K in keyof TEvents]?: Listener<TEvents[K]>[];
    } = {};

    /**
     * Register a listener.
     * Returns a function that removes the listener.
     */
    on<K extends keyof TEvents>(
        event: K,
        listener: Listener<TEvents[K]>
    ): () => void {
        (this.listeners[event] ??= []).push(listener);

        return () => this.off(event, listener);
    }

    /**
     * Register a listener that will run only once.
     */
    once<K extends keyof TEvents>(
        event: K,
        listener: Listener<TEvents[K]>
    ): () => void {
        const wrapper: Listener<TEvents[K]> = (...args) => {
            this.off(event, wrapper);
            listener(...args);
        };

        return this.on(event, wrapper);
    }

    /**
     * Remove a listener.
     */
    off<K extends keyof TEvents>(
        event: K,
        listener: Listener<TEvents[K]>
    ): void {
        const listeners = this.listeners[event];

        if (!listeners) {
            return;
        }

        this.listeners[event] = listeners.filter(
            (fn) => fn !== listener
        ) as Listener<TEvents[K]>[];
    }

    /**
     * Emit an event.
     */
    emit<K extends keyof TEvents>(
        event: K,
        ...args: TEvents[K]
    ): void {
        const listeners = [...(this.listeners[event] ?? [])];

        for (const listener of listeners) {
            listener(...args);
        }
    }

    /**
     * Remove all listeners for an event,
     * or all listeners if no event is provided.
     */
    clear<K extends keyof TEvents>(event?: K): void {
        if (event) {
            delete this.listeners[event];
            return;
        }

        this.listeners = {};
    }

    /**
     * Number of listeners attached to an event.
     */
    listenerCount<K extends keyof TEvents>(event: K): number {
        return this.listeners[event]?.length ?? 0;
    }
}