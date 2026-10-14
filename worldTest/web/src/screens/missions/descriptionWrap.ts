// The mission details description as display lines. The author controls
// the breaks: every `\n` in the text starts a new line (a blank line in
// the text becomes one empty display row between paragraphs), and each
// chunk only word-wraps at the column width as a safety net. Nothing is
// truncated: the details panel scrolls its own rows.

export const DESCRIPTION_COLS = 50;

/** Wraps one chunk of the description to at most DESCRIPTION_COLS
 *  characters per line (the safety net for author break points). */
export function wrapChunk(text: string): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > DESCRIPTION_COLS) {
            if (line) lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines;
}

/** The full description as display rows (see the file comment). */
export function wrapDescription(text: string): string[] {
    const lines: string[] = [];
    for (const chunk of text.split('\n')) {
        const trimmed = chunk.trim();
        if (trimmed === '') {
            // A blank line in the text: one empty row (never two in a
            // row, never at the very top).
            if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
            continue;
        }
        lines.push(...wrapChunk(trimmed));
    }
    return lines;
}
