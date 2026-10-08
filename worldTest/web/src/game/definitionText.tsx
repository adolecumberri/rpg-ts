import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// The definition mark language (LoL-style item text): inline tags colorize
// the pieces of a description. The renderer turns them into spans, so a
// tagged string can go anywhere React renders text.
//
//   [impact]every impact hit[/impact]   → yellow
//   [physical]10 + 20% defence[/physical] → red
//   [magical]+5 magic damage[/magical] → blue-purple
//   [true]100 true damage[/true]       → white
//   [gold]Phantom Strike[/gold]        → amber (passive/active names)
// ---------------------------------------------------------------------------

const TAGS: Record<string, string> = {
    impact: 'def-color def-color--impact',
    physical: 'def-color def-color--physical',
    magical: 'def-color def-color--magical',
    true: 'def-color def-color--true',
    gold: 'def-color def-color--gold',
};

/** Parses one (possibly nested) slice of the text. */
function parse(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let index = 0;

    while (index < text.length) {
        const open = text.indexOf('[', index);
        if (open === -1) {
            nodes.push(text.slice(index));
            break;
        }
        const closeBracket = text.indexOf(']', open);
        if (closeBracket === -1) {
            nodes.push(text.slice(index));
            break;
        }

        const tag = text.slice(open + 1, closeBracket);
        const cls = TAGS[tag];
        if (!cls) {
            // Not a known tag: keep the bracket literally and move on.
            nodes.push(text.slice(index, closeBracket + 1));
            index = closeBracket + 1;
            continue;
        }

        const closeTag = `[/${tag}]`;
        const end = text.indexOf(closeTag, closeBracket + 1);
        if (end === -1) {
            // Unclosed tag: keep it literally.
            nodes.push(text.slice(index, closeBracket + 1));
            index = closeBracket + 1;
            continue;
        }

        if (open > index) nodes.push(text.slice(index, open));
        nodes.push(
            <span key={`${tag}-${open}`} className={cls}>
                {parse(text.slice(closeBracket + 1, end))}
            </span>,
        );
        index = end + closeTag.length;
    }

    return nodes;
}

/**
 * Renders a definition string into colored nodes: every `[tag]...[/tag]`
 * pair becomes a span with the tag's color, nested pairs nest, and
 * unknown or unclosed brackets stay as plain text.
 */
export function highlightDefinition(text: string): ReactNode[] {
    return parse(text);
}
