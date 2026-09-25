// Global story messages: systems (arrival events, missions) push lines
// here and the web shows them in a text box over everything. The
// speaker is optional (name shown when present); the portrait is an id
// the web resolves, falling back to the general portrait.

export type MessageLine = {
    speaker?: string;
    portrait?: string;
    text: string;
};

export class MessageQueue {
    private lines: MessageLine[] = [];

    push(lines: MessageLine[]): void {
        this.lines.push(...lines);
    }

    /** The line currently on screen (undefined when finished). */
    peek(): MessageLine | undefined {
        return this.lines[0];
    }

    /** Consumes the current line; returns the next one (undefined when finished). */
    next(): MessageLine | undefined {
        this.lines.shift();
        return this.peek();
    }

    hasPending(): boolean {
        return this.lines.length > 0;
    }

    clear(): void {
        this.lines = [];
    }
}
