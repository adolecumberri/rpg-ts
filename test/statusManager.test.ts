import { Character } from '../src/Classes/Character';
import { Stats } from '../src/Classes/Stats';
import { StatusInstance } from '../src/Classes/StatusInstance';
import { StatusManager } from '../src/Classes/StatusManager';

const percentage_debuff = new StatusInstance({
    definition: {
        name: 'Poison',
        applyOn: 'after_attack',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        statsAffected: [
            {
                type: 'DEBUFF_PERCENTAGE',
                from: 'totalHp',
                to: 'hp',
                value: 21,
                recovers: false,
            },
        ],
    },
});

const percentage_buff = new StatusInstance({
    definition: {
        name: 'Rage',
        applyOn: 'before_attack',
        duration: { type: 'TEMPORAL', value: 1 },
        triggersOnAdd: true,
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
    },
});

const fixed_buff = new StatusInstance({
    definition: {
        name: 'ex',
        applyOn: 'before_attack',
        duration: { type: 'TEMPORAL', value: 2 },
        triggersOnAdd: true,
        usageFrequency: 'ONCE',
        statsAffected: [
            {
                type: 'BUFF_FIXED',
                from: 'attack',
                to: 'attack',
                value: 20,
                recovers: true,
            },
        ],
    },
});

const fixed_debuff = new StatusInstance({
    definition: {
        name: 'weakness',
        applyOn: 'before_attack',
        duration: { type: 'PERMANENT' },
        triggersOnAdd: true,
        usageFrequency: 'ONCE',
        statsAffected: [
            {
                type: 'DEBUFF_FIXED',
                from: 'attack',
                to: 'attack',
                value: 20,
                recovers: true,
            },
        ],
    },
});


describe('Testing Status manager', () => {
    it('Character muere tras 5 turnos con percentage_debuff', () => {
        const char = new Character({ stats: new Stats({ hp: 100, totalHp: 100, attack: 10 }) });
        const manager = new StatusManager(char);

        manager.add(percentage_debuff);

        // 5 turnos (after_attack → aplica el debuff)
        for (let i = 0; i < 5; i++) {
            manager.activate('after_attack');
        }

        // expect(char.isAlive()).toBe(false);
        expect(char.stats.getProp('hp')).toBe(0);
        expect(manager.statuses.length).toBe(0); // statusManager limpia al morir
    });
});
