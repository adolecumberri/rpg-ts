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
