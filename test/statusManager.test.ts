import { StatusInstance } from '../src/Classes/StatusInstance';

const poison = new StatusInstance({
    name: 'Poison',
    applyOn: 'after_turn',
    duration: { type: 'TEMPORAL', value: 3 },
    usageFrequency: 'PER_ACTION',
    statsAffected: [
        {
            type: 'DEBUFF_FIXED',
            from: 'hp',
            to: 'hp',
            value: 5,
            recovers: false,
        },
    ],
});

const buff = new StatusInstance({
    name: 'Rage',
    applyOn: 'before_attack',
    duration: { type: 'TEMPORAL', value: 2 },
    usageFrequency: 'PER_ACTION',
    statsAffected: [
        {
            type: 'BUFF_PERCENTAGE',
            from: 'attack',
            to: 'attack',
            value: 50,
            recovers: true,
        },
    ],
});

const shield = new StatusInstance({
    name: 'Shield',
    applyOn: 'before_defence',
    duration: { type: 'PERMANENT' },
    usageFrequency: 'ONCE',
    statsAffected: [
        {
            type: 'BUFF_FIXED',
            from: 'defence',
            to: 'defence',
            value: 10,
            recovers: true,
        },
    ],
});
