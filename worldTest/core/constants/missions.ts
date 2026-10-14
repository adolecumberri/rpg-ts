import type { Mission } from '../missions';
import { FLAGS } from './flags';

// ---------------------------------------------------------------------------
// The global mission dictionary: EVERY mission that exists in the app is
// declared here, once, keyed by its id. The MissionManager registers
// from these constants, so the board, the story and the save system
// share the same source of truth. Display conditions live on the
// entries themselves: `requires` (another mission already beaten),
// `requiredFlags` (story flags) and `availableMonths` (a certain time
// of the year).
// ---------------------------------------------------------------------------

export const Missions = {
    // ------------------------------------------------------------------
    // Act 1 story: the sparring trail and the east field hunt.
    // ------------------------------------------------------------------

    // The training trail, now TWO missions: the opening SPARRING — the
    // whole starting squad (the recruit + the two teammates) fights one
    // Order soldier, one archer and one mage together (losing still
    // completes it; each class defeated leaves its win flag) — and then
    // the captain. The captain's reward opens the map and the east
    // field.
    sparring: {
        id: 'sparring',
        title: 'Sparring',
        level: 1,
        commission: 0,
        description: 'The starting squad spars against an Order soldier, an archer and a mage.',
        availableAt: ['camp'],
        requiredFlags: [FLAGS.BRANCH_CHOSEN],
        details: {
            description: 'Captain Rodrigo wants to see what\n' +
                'the recruit is made of.\n' +
                '\n' +
                'The whole squad takes the field against an Order\n' +
                'soldier, an Order archer and an Order mage.\n' +
                '\n' +
                'Losing costs nothing but pride.\n' +
                'A win is remembered.',
            requiredItems: [],
            expedition: { members: 3 },
            cancelable: false,
            placeId: 'camp',
        },
        steps: [
            {
                id: 'vs_squad',
                kind: 'wait_battle',
                completeOn: ['won', 'lost', 'fled'],
                battle: { fightId: 'sparring_squad', placeId: 'camp' },
                lines: [{ speaker: 'Captain Rodrigo', text: 'Three of them: soldier, archer and mage. Fight as one.' }],
            },
        ],
    },

    // The final sparring mission: the captain himself. Only offered once
    // the opening Sparring is done; the reward opens the map and the
    // east field.
    spar_with_captain: {
        id: 'spar_with_captain',
        title: 'Sparring with the Captain',
        level: 1,
        commission: 0,
        description: 'The Sparring is done: now Captain Rodrigo himself.',
        availableAt: ['camp'],
        requires: ['sparring'],
        details: {
            description: 'The captain is the last test.\n' +
                '\n' +
                'Beat him — or lose with honor —\n' +
                'the training is over: the map and\n' +
                'the east field open.',
            requiredItems: [],
            rewards: [{ itemId: 'wood', quantity: 2 }],
            rewardGold: 20,
            expedition: { members: 1 },
            cancelable: false,
            placeId: 'camp',
        },
        steps: [
            {
                id: 'vs_captain',
                kind: 'wait_battle',
                completeOn: ['won', 'lost', 'fled'],
                battle: { fightId: 'sparring_captain', placeId: 'camp' },
                lines: [{ speaker: 'Captain Rodrigo', text: 'Now me. Show me what the Sparring taught you.' }],
            },
            {
                id: 'reward',
                kind: 'reward',
                flags: [FLAGS.TRAINING_COMPLETED, FLAGS.MAP_UNLOCKED, FLAGS.EAST_FIELD_UNLOCKED],
            },
        ],
    },

    // The first real hunt: the squad of five (the recruit + four) takes
    // the east field, fights three boars and then four more with no
    // healing between the battles. The spectral boar appears: the squad
    // votes (2 leave, 2 fight) and the recruit breaks the tie. The
    // fight is NOT winnable — retreating (or never engaging) wins the
    // mission; anyone who falls stays behind in the east field.
    caza_menor: {
        id: 'caza_menor',
        title: 'Caza Menor',
        level: 1,
        commission: 0,
        description: 'The east field is open: hunt the boar packs, then answer the squad\'s vote.',
        availableAt: ['camp'],
        requires: ['spar_with_captain'],
        details: {
            description: 'The east field runs wild with boars.\n' +
                '\n' +
                'Take four recruits and clear two packs:\n' +
                'three boars, then four more, with no\n' +
                'healing between the hunts.\n' +
                '\n' +
                'The squad\'s vote over the spectral\n' +
                'boar is yours to break.\n' +
                '\n' +
                'Fleeing a fight you cannot win is\n' +
                'a victory.',
            requiredItems: [],
            rewards: [{ itemId: 'hay', quantity: 3 }],
            rewardGold: 30,
            expedition: { members: 5 },
            cancelable: false,
            placeId: 'east_field',
        },
        steps: [
            {
                id: 'go',
                kind: 'travel',
                placeId: 'east_field',
                allowTravelTo: ['east_field', 'camp'],
            },
            {
                id: 'boars_3',
                kind: 'wait_battle',
                completeOn: ['won', 'lost', 'fled'],
                battle: { fightId: 'boar_trio', placeId: 'east_field' },
            },
            {
                id: 'boars_4',
                kind: 'wait_battle',
                completeOn: ['won', 'lost', 'fled'],
                battle: { fightId: 'boar_four', placeId: 'east_field' },
                lines: [{ speaker: 'Arturo', text: 'More of them... and nobody has bandaged a wound. Stand fast!' }],
            },
            {
                id: 'vote',
                kind: 'dialogue',
                lines: [
                    { speaker: 'Arturo', text: 'That glow is not natural. My vote: we leave. We are already wounded.' },
                    { speaker: 'Archer', text: 'Leave? We came to hunt. One more boar, spectral or not. I vote we fight.' },
                    { speaker: 'Healer', text: 'Half of us can barely stand. I vote we pull back to camp.' },
                    { speaker: 'Soldier', text: 'And show the captain we ran from a pig? I vote we fight.' },
                    {
                        speaker: 'Captain Rodrigo',
                        text: 'Two to leave, two to fight. Recruit — the vote is yours. What do we do?',
                        choices: [
                            {
                                label: '⚔️ Fight the spectral boar',
                                effects: [
                                    {
                                        kind: 'startFight',
                                        fightId: 'spectral_boar',
                                        placeId: 'east_field',
                                        missionId: 'caza_menor',
                                    },
                                ],
                            },
                            {
                                label: '🏃 Leave the field',
                                effects: [
                                    { kind: 'skipBattle', missionId: 'caza_menor' },
                                    { kind: 'pushChat', chatId: 'caza_spectral_left' },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'spectral',
                kind: 'wait_battle',
                completeOn: ['fled', 'won'],
                battle: { fightId: 'spectral_boar', placeId: 'east_field' },
            },
            {
                id: 'reward',
                kind: 'reward',
                flags: [FLAGS.CAZA_COMPLETED],
            },
        ],
    },
} satisfies Record<string, Mission>;
