// Fixed values of the story chats: missions trigger chats by id.
import type { DialogueLine } from '../dialogue';

export type ChatDefinition = {
    id: string;
    lines: DialogueLine[];
};

// The deprecated story missions took their chats with them; new
// content will register its own here.
export const CHATS: Record<string, ChatDefinition> = {};
