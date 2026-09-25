// Fixed values of the story chats: missions trigger chats by id.
import type { DialogueLine } from '../dialogue';
import { ACT1 } from './act1';

export type ChatDefinition = {
    id: string;
    lines: DialogueLine[];
};

export const CHATS: Record<string, ChatDefinition> = {
    hay_thanks: {
        id: 'hay_thanks',
        lines: [
            { speaker: ACT1.household.find((member) => member.id === 'lord_son')!.name, text: 'You brought the sickles! Father will be pleased.' },
            { speaker: ACT1.farmers.arturoName, text: 'My lord! We have goblins here!!' },
        ],
    },
};
