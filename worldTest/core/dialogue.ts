// Phrase-by-phrase dialogue: missions and events push lines, the UI
// reveals them one at a time with a "next" tap.

export type DialogueLine = {
    speaker: string;
    text: string;
};

export class Dialogue {
    private lines: DialogueLine[];
    private index = 0;

    constructor(lines: DialogueLine[]) {
        this.lines = [...lines];
    }

    /**
     * The phrase currently on screen (null when finished).
     */
    current(): DialogueLine | null {
        return this.index < this.lines.length ? this.lines[this.index] : null;
    }

    /**
     * Advances to the next phrase and returns it (null when finished).
     */
    advance(): DialogueLine | null {
        this.index++;
        return this.current();
    }

    done(): boolean {
        return this.index >= this.lines.length;
    }

    remaining(): number {
        return Math.max(0, this.lines.length - this.index);
    }
}
