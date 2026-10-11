import type { ActDefinition } from '../story';
import { FLAGS } from '../constants/flags';

// ---------------------------------------------------------------------------
// The act catalog: the story's spine, pure data. The session's story
// engine evaluates these acts after every change that can move the
// story (travel, mission steps, flag writes, battle ends, day passes).
//
// Act 1: the recruit's opening. The intro fires once the new game
// boots (the web calls session.beginStory(), which sets NEW_GAME); the
// training and the caza menor run as missions on the camp board, with
// the map locked until the training's reward step opens it.
// ---------------------------------------------------------------------------
export const ACTS: ActDefinition[] = [
    {
        id: 'act_1',
        name: 'Act 1',
        startWhen: { flags: { any: [FLAGS.NEW_GAME] } },
        completeWhen: { flags: { all: ['NEVER_COMPLETES'] } },
        events: [
            {
                id: 'act1_welcome',
                when: { flags: { any: [FLAGS.NEW_GAME] } },
                effects: [{ kind: 'pushChat', chatId: 'act1_intro' }],
            },
        ],
        onComplete: [],
    },
];
