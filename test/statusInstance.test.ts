import { Character } from '../src/Classes/Character';
import { Stats } from '../src/Classes/Stats';
import { StatusInstance } from '../src/Classes/StatusInstance';
import { MODIFICATION_TYPES } from '../src/constants/common.constants';
import { STATUS_DURATIONS, STATUS_USAGE_FREQUENCY } from '../src/constants/status.constants';
import { StatusDefinition } from '../src/types/status.types';


const makeStats = () => new Stats({ attack: 10, defence: 5 });

const makeBuff = (overrides: Partial<StatusDefinition> = {}): StatusDefinition => ({
    name: 'buff_attack',
    applyOn: 'before_attack',
    duration: { type: STATUS_DURATIONS.PERMANENT },
    usageFrequency: STATUS_USAGE_FREQUENCY.PER_ACTION,
    statsAffected: [
        { from: 'attack', to: 'attack', type: MODIFICATION_TYPES.BUFF_FIXED, value: 10, recovers: true },
    ],
    ...overrides,
});

describe('StatusInstance', () => {
    it('1. should create 2 different StatusInstances with unique IDs', () => {
        const s1 = new StatusInstance({ definition: makeBuff() });
        const s2 = new StatusInstance({ definition: makeBuff() });
        expect(s1.id).not.toBe(s2.id);
    });

    it('2. canActivate should be true when permanent, usageFrequency is ONCE, and not used', () => {
        const s = new StatusInstance(
            { definition: makeBuff({ usageFrequency: STATUS_USAGE_FREQUENCY.ONCE }) },
        );
        expect(s.canActivate()).toBe(true);

        const char = new Character({ stats: makeStats() });
        s.triggerInstances(char.stats);

        expect(s.canActivate()).toBe(false);
    });

    it('3. canActivate should be true when permanent, usageFrequency is PER_ACTION', () => {
        const s = new StatusInstance(
            { definition: makeBuff({ usageFrequency: STATUS_USAGE_FREQUENCY.PER_ACTION }) },
        );

        expect(s.canActivate()).toBe(true);
        const char = new Character({ stats: makeStats() });
        s.triggerInstances(char.stats);
        expect(s.canActivate()).toBe(true);
    });

    it('4. canActivate should be false when permanent, usageFrequency is ONCE, and already used', () => {
        const s = new StatusInstance(
            { definition: makeBuff({ usageFrequency: STATUS_USAGE_FREQUENCY.ONCE }) },
        );
        const stats = makeStats();
        const char = new Character({ stats });
        s.triggerInstances(char.stats);
        expect(s.canActivate()).toBe(false);
    });

    it('5. hasBeenUsed should be false before activation, true after activation', () => {
        const s = new StatusInstance({ definition: makeBuff() });
        expect(s.hasBeenUsed()).toBe(false);
        const stats = makeStats();
        const char = new Character({ stats });
        s.triggerInstances(char.stats);
        expect(s.hasBeenUsed()).toBe(true);
    });

    it('6. canActivate should be true while temporal duration > 0, false when duration = 0', () => {
        const s = new StatusInstance(
            { definition: makeBuff({ duration: { type: STATUS_DURATIONS.TEMPORAL, value: 2 } }) },
        );
        const stats = makeStats();
        const char = new Character({ stats });
        // First activation (duration goes 2 -> 1)
        s.triggerInstances(char.stats);
        expect(s['canActivate']()).toBe(true);

        // Second activation (duration goes 1 -> 0)
        s.triggerInstances(char.stats);
        expect(s['canActivate']()).toBe(false);
    });

    it('7. isExpired should behave correctly', () => {
        const permanent = new StatusInstance({ definition: makeBuff({ duration: { type: STATUS_DURATIONS.PERMANENT } }) });
        const temporal = new StatusInstance({ definition: makeBuff({ duration: { type: STATUS_DURATIONS.TEMPORAL, value: 1 } }) });
        const char = new Character({ stats: makeStats() });


        expect(permanent.isExpired()).toBe(false);

        temporal.triggerInstances(char.stats); // reduce to 0
        expect(temporal.isExpired()).toBe(true);
    });

    it('8. recover should remove the applied value from character stats', () => {
        const s = new StatusInstance({ definition: makeBuff() });
        const stats = makeStats();
        const char = new Character({ stats });

        // Apply buff 3 times
        s.triggerInstances(char.stats);
        s.triggerInstances(char.stats);
        s.triggerInstances(char.stats);

        expect(stats.getProp('attack')).toBe(40); // 10 + 10*3

        s.recover(stats);
        expect(stats.getProp('attack')).toBe(10); // back to original
    });

    it('accumulates recovery per affected stat and recovers independently', () => {
        const stats = new Stats({ attack: 10, defence: 5 });
        const char = new Character({ stats });


        const def: StatusDefinition = {
            name: 'mixed',
            applyOn: 'before_attack',
            duration: { type: STATUS_DURATIONS.PERMANENT },
            usageFrequency: STATUS_USAGE_FREQUENCY.PER_ACTION,
            statsAffected: [
                // +10 attack (recovers)
                { id: "attack_instance_id", from: 'attack', to: 'attack', type: 'BUFF_FIXED', value: 10, recovers: true },
                // -2 defence (recovers)
                { id: "defence_instance_id", from: 'defence', to: 'defence', type: 'DEBUFF_FIXED', value: 2, recovers: true },
                // +5 attack (NO recovers)
                { from: 'attack', to: 'attack', type: 'BUFF_FIXED', value: 5, recovers: false },
            ],
        };

        const s = new StatusInstance({ definition: def });

        s.triggerInstances(char.stats); // attack: 10 + 10 + 5 = 25 ; defence: 5 - 2 = 3
        s.triggerInstances(char.stats); // attack: 25 + 10 + 5 = 40 ; defence: 3 - 2 = 1

        // Comprobamos acumulados por stat
        const affected = s.getAffectedInstances();

        const atk = affected.find((a) => a.id === "attack_instance_id")!;
        const defn = affected.find((a) => a.id === 'defence_instance_id')!;

        expect(atk.accumulated).toBe(20); // +10 * 2 (solo recovers)
        expect(defn.accumulated).toBe(4); // +2 * 2 (saved as absolute. but it´s fixed_debuff)

        // Estado actual
        expect(stats.getProp('attack')).toBe(40);
        expect(stats.getProp('defence')).toBe(1);

        s.recover(stats);

        // attack vuelve a 20 (no revierte los +5*2 = +10 porque recovers=false)
        expect(stats.getProp('attack')).toBe(20);
        // defence vuelve a 5
        expect(stats.getProp('defence')).toBe(5);

        // recovery map limpiado
        const afterRecover = s.getAffectedInstances();
        expect(afterRecover.every((a) => a.accumulated === 0)).toBe(true);
    });
});
