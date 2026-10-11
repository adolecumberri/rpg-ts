import type { StoryCondition, StoryEffect } from './story';

// Phrase-by-phrase dialogue: missions and events push lines, the UI
// reveals them one at a time with a "next" tap. A line may be story-
// gated (hidden until its condition holds) and may carry player
// choices: picking one applies its effects (flags, missions, fights).

// One selectable option of a dialogue line.
export type DialogueChoice = {
    label: string;
    // What choosing this option does: set flags, start missions or
    // fights, move people... applied through the session.
    effects: StoryEffect[];
};

export type DialogueLine = {
    speaker: string;
    text: string;
    // The line is hidden while the condition does not hold (the
    // session filters gated lines when it pushes them).
    when?: StoryCondition;
    // Player choices: when present, the UI shows the options instead
    // of advancing on tap.
    choices?: DialogueChoice[];
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
