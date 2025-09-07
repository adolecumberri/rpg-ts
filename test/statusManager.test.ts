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
    test('Character muere después de 5 turnos con percentage_debuff', () => {
        // stats base
        const stats = new Stats({ totalHp: 100, hp: 100, attack: 10 });
        const char = new Character({ stats });

        // manager asociado al personaje
        const manager = new StatusManager({
            character: char,
        });

        // añadimos el debuff al personaje (add se registrará en after_attack y en after_die)
        manager.add(percentage_debuff, char);

        // comprobación inicial
        expect(manager.statuses.length).toBe(1);
        expect(char.isAlive()).toBe(true);

        // Simular 5 ataques (cada char.attack() dispara after_attack vía CombatBehavior)
        // Si no te interesa la mecánica de CombatBehavior para este test, puedes llamar manager.activate('after_attack', char)
        for (let i = 0; i < 5; i++) {
            char.attack(); // -> emit after_attack -> StatusManager.activate -> aplica -21% totalHp
        }

        // El personaje debe estar muerto y hp a 0
        expect(char.isAlive()).toBe(false);
        expect(char.stats.getProp('hp')).toBe(0);

        debugger;
        // Tras la muerte, el manager debe haberse limpiado (removeAllStatuses fue llamado por el listener 'after_die')
        expect(manager.statuses.length).toBe(0);
    });
});
