// Global story messages: systems (arrival events, missions, battles)
// push lines here and the web shows them in a dialog box over
// everything. The speaker is optional (name shown when present); the
// portrait is an id (or url) the web resolves, falling back to the
// general portrait; the side decides which half of the box the
// portrait sits on (left by default).

export type MessageLine = {
    speaker?: string;
    portrait?: string;
    text: string;
    side?: 'left' | 'right';
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

    /** How many lines are left (the current one included). */
    remaining(): number {
        return this.lines.length;
    }

    clear(): void {
        this.lines = [];
    }
}
