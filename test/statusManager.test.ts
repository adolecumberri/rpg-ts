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

let percentage_buff = new StatusInstance({
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

let fixed_buff = new StatusInstance({
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

        manager.addStatusInstance(percentage_debuff);

        // 5 turnos (after_attack → aplica el debuff)
        for (let i = 0; i < 5; i++) {
            manager.trigger('after_attack');
        }

        // expect(char.isAlive()).toBe(false);
        expect(char.getStat('hp')).toBe(0);
        expect(char.isAlive()).toBe(false);
        expect(manager.statuses.size).toBe(0); // statusManager limpia al morir
    });

    it('Character receives percentage_buff and fixed_buff, then they expire in order', () => {

        //!!!! this one triggers on Add and gets removed.
        percentage_buff = new StatusInstance({
            definition: {
                name: 'Rage',
                applyOn: 'after_turn',
                duration: { type: 'TEMPORAL', value: 1 },
                triggersOnAdd: true,
                usageFrequency: 'ONCE',
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
            id: "2",
        });

        fixed_buff = new StatusInstance({
            definition: {
                name: 'ex',
                applyOn: 'after_turn',
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
        const char = new Character({
            stats: new Stats({ hp: 100, totalHp: 100, attack: 100 }),
        });
        const manager = new StatusManager(char);

        manager.addStatusInstance(percentage_buff);
        manager.addStatusInstance(fixed_buff);

        const percentage_buff_instance = manager.statuses.get(percentage_buff.id);
        const fixed_buff_instance = manager.statuses.get(fixed_buff.id) as StatusInstance;

        //!!!! not using the instance, because the instance gets added and removed
        // that behaviour is expected.
        expect(percentage_buff?.hasBeenUsed()).toBe(true);
        expect(percentage_buff?.timesUsed).toBe(1);
        expect(percentage_buff?.canActivate()).toBe(false);
        expect(percentage_buff?.isExpired()).toBe(true);

        expect(fixed_buff_instance.hasBeenUsed()).toBe(true);
        expect(fixed_buff_instance.timesUsed).toBe(1);
        expect(fixed_buff_instance.canActivate()).toBe(false);
        expect(fixed_buff_instance.isExpired()).toBe(false);

        // Initial stats after both buffs apply (they both triggerOnAdd)
        // percentage_buff: +50% attack → +50 (since base attack=100)
        // fixed_buff: +20 attack
        // expected: 100 + 50 + 20 = 170
        expect(manager.statuses.size).toBe(1);
        expect(char.stats.getProp('attack')).toBe(120);

        expect(fixed_buff_instance.getAffectedInstances()[0].accumulated).toBe(20);
        expect(fixed_buff_instance.timesUsed).toBe(1);

        // First attack (before_attack → triggers both)
        manager.trigger('after_turn');
        expect(manager.statuses.size).toBe(1);
        expect(fixed_buff_instance.getAffectedInstances()[0].accumulated).toBe(20);
        expect(fixed_buff_instance.timesUsed).toBe(1);

        expect(char.stats.getProp('attack')).toBe(120);
        expect(manager.hasStatus(percentage_buff.id)).toBe(false);

        // Second attack (before_attack again)
        manager.trigger('after_turn');
        expect(fixed_buff_instance.hasBeenUsed()).toBe(true);
        expect(fixed_buff_instance.timesUsed).toBe(1);
        expect(fixed_buff_instance.canActivate()).toBe(false);
        expect(fixed_buff_instance.isExpired()).toBe(true);

        // fixed_buff was ONCE usageFrequency, should now expire
        // attack returns to base value: 100
        expect(manager.statuses.size).toBe(0);
        expect(char.stats.getProp('attack')).toBe(100);
        expect(manager.hasStatus(fixed_buff.id)).toBe(false);
    });
});
