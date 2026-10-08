import type { Mission } from '../missions';

// ---------------------------------------------------------------------------
// The global mission dictionary: EVERY mission that exists in the app is
// declared here, once, keyed by its id. The MissionManager registers
// from these constants, so the board, the story and the save system
// share the same source of truth. Display conditions live on the
// entries themselves: `requires` (another mission already beaten) and
// `availableMonths` (a certain time of the year).
// ---------------------------------------------------------------------------

export const Missions = {
    // The four seasonal encargos: one per season. Each one is only
    // offered during its months; out of season it appears in the Otras
    // tab (known, but the accept gate refuses it).
    spring_sowing: {
        id: 'spring_sowing',
        title: 'Spring Sowing',
        level: 1,
        commission: 5,
        daysAvailable: 20,
        description: 'The fields thaw: sow the spring crops before the rains end.',
        availableMonths: [0, 1, 2],
        availableAt: ['farm'],
        details: {
            description: 'The fields thaw and the season is short. Sow the spring crops before the rains end, and mind the late frosts.',
            requiredItems: [],
            rewards: [{ itemId: 'hay', quantity: 2 }],
            rewardGold: 15,
            expedition: { members: 3 },
            cancelable: true,
            placeId: 'farm',
        },
        steps: [
            { id: 'go', kind: 'travel', placeId: 'farm' },
            { id: 'done', kind: 'reward', flags: [] },
        ],
    },
    summer_fishing: {
        id: 'summer_fishing',
        title: 'Summer Fishing',
        level: 2,
        commission: 8,
        daysAvailable: 12,
        description: 'The summer fish run is here. Bring fresh catches to the farm.',
        availableMonths: [3, 4, 5],
        availableAt: ['farm'],
        details: {
            description: 'The summer fish run is here. Bring fresh catches to the farm before the season ends and the boats stop sailing.',
            requiredItems: [],
            rewards: [{ itemId: 'hay', quantity: 3 }],
            rewardGold: 20,
            expedition: { members: 8 },
            cancelable: true,
            placeId: 'playa_sur',
        },
        steps: [
            { id: 'go', kind: 'travel', placeId: 'playa_sur' },
            { id: 'done', kind: 'reward', flags: [] },
        ],
    },
    autumn_harvest: {
        id: 'autumn_harvest',
        title: 'Autumn Harvest',
        level: 2,
        commission: 10,
        daysAvailable: 15,
        description: 'The crops are heavy: bring the harvest in before the storms.',
        availableMonths: [6, 7, 8],
        availableAt: ['farm'],
        details: {
            description: 'The crops are heavy and the storms are coming. Bring the harvest in before the first rains rot the grain.',
            requiredItems: [],
            rewards: [{ itemId: 'wood', quantity: 2 }, { itemId: 'hay', quantity: 3 }],
            rewardGold: 25,
            expedition: { members: 6 },
            cancelable: true,
            placeId: 'farm',
        },
        steps: [
            { id: 'go', kind: 'travel', placeId: 'farm' },
            { id: 'done', kind: 'reward', flags: [] },
        ],
    },
    winter_stock: {
        id: 'winter_stock',
        title: 'Winter Stock',
        level: 3,
        commission: 12,
        daysAvailable: 25,
        description: 'The camp needs firewood: stock the sheds before the snow.',
        availableMonths: [9, 10, 11],
        availableAt: ['camp'],
        details: {
            description: 'The camp needs firewood before the snow closes the roads. Stock the sheds and check the storerooms.',
            requiredItems: [],
            rewards: [{ itemId: 'wood', quantity: 5 }],
            rewardGold: 30,
            expedition: { members: 4 },
            cancelable: true,
            placeId: 'camp',
        },
        steps: [
            { id: 'go', kind: 'travel', placeId: 'camp' },
            { id: 'done', kind: 'reward', flags: [] },
        ],
    },

    // A free test encargo to exercise the mission page: offered on the
    // farm board from day one.
    test_mission: {
        id: 'test_mission',
        title: 'Test Mission',
        level: 1,
        commission: 0,
        daysAvailable: 30,
        description: 'A test encargo to exercise the mission page.',
        availableAt: ['farm'],
        details: {
            description: 'A test encargo to exercise the mission page. Accept it, watch it move to Aceptadas, cancel it, and check every section of the details view works as expected.',
            requiredItems: [],
            rewards: [{ itemId: 'wood', quantity: 2 }],
            rewardGold: 10,
            expedition: { members: 8 },
            cancelable: true,
            placeId: 'camp',
        },
        steps: [
            { id: 'go', kind: 'travel', placeId: 'camp' },
            { id: 'done', kind: 'reward' },
        ],
    },
} satisfies Record<string, Mission>;
