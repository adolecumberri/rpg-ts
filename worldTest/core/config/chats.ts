// Fixed values of the story chats: missions trigger chats by id, the
// story engine pushes them through its pushChat effect, and arrival
// events queue them with their battles.
import type { DialogueLine } from '../dialogue';
import { FLAGS } from '../constants/flags';
import { ARCHER_JOB, HEALER_JOB, SOLDIER_JOB } from '../constants/jobs';

export type ChatDefinition = {
    id: string;
    lines: DialogueLine[];
};

export const CHATS: Record<string, ChatDefinition> = {
    // ------------------------------------------------------------------
    // Act 1 opening: Captain Rodrigo welcomes the new recruit; the last
    // line carries the branch choice (archer / soldier / mage).
    // ------------------------------------------------------------------
    act1_intro: {
        id: 'act1_intro',
        lines: [
            {
                speaker: 'Captain Rodrigo',
                text: 'Recruit! Over here. You were bought off a farm, so I will keep this simple: ' +
                    'the Order needs bodies, not heroes. You will learn to fight — or you will die ' +
                    'in a field somewhere.',
            },
            {
                speaker: 'Captain Rodrigo',
                text: 'First, pick your branch. The bow, the blade or the staff. Choose what you will carry into battle.',
            },
            {
                speaker: 'Captain Rodrigo',
                text: 'Choose your branch.',
                choices: [
                    {
                        label: '⚔️ Soldier',
                        effects: [
                            { kind: 'setFlag', flag: FLAGS.BRANCH_CHOSEN },
                            { kind: 'setFlag', flag: FLAGS.BRANCH_SOLDIER },
                            {
                                kind: 'setJob',
                                characterId: 'player',
                                jobId: SOLDIER_JOB.id,
                                weaponItemId: 'sword',
                            },
                        ],
                    },
                    {
                        label: '🏹 Archer',
                        effects: [
                            { kind: 'setFlag', flag: FLAGS.BRANCH_CHOSEN },
                            { kind: 'setFlag', flag: FLAGS.BRANCH_ARCHER },
                            {
                                kind: 'setJob',
                                characterId: 'player',
                                jobId: ARCHER_JOB.id,
                                weaponItemId: 'bow',
                            },
                        ],
                    },
                    {
                        label: '✨ Mage',
                        effects: [
                            { kind: 'setFlag', flag: FLAGS.BRANCH_CHOSEN },
                            { kind: 'setFlag', flag: FLAGS.BRANCH_MAGE },
                            {
                                kind: 'setJob',
                                characterId: 'player',
                                jobId: HEALER_JOB.id,
                                weaponItemId: 'staff',
                            },
                        ],
                    },
                ],
            },
        ],
    },

    // The east field arrival: the first boar pack charges the squad.
    caza_arrival: {
        id: 'caza_arrival',
        lines: [
            { speaker: 'Arturo', text: 'The east field... the captain was right, the grass is tall and something is moving in it.' },
            { speaker: 'Arturo', text: 'Three of them! Boars! Watch the flanks!' },
        ],
    },

    // The squad chose to leave the spectral boar alone.
    caza_spectral_left: {
        id: 'caza_spectral_left',
        lines: [
            { speaker: 'Captain Rodrigo', text: 'A wise call. The Order does not waste recruits on ghosts. ' +
                'Back to camp — the hunt is over.' },
        ],
    },
};
