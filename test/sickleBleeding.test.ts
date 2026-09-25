import { Character, Stats } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { DEFAULT_ITEM_TABLE } from '../worldTest/core/items';
import { bleedingStatus } from '../worldTest/core/statuses';
import { addReaction } from '../worldTest/core/damage/reactions';
import { resolveGeneralAttack } from '../worldTest/core/damage/general';

const noCrit = () => 1;

function character(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

function sickleFarmer(): Character {
    const attacker = character('farmer', { attack: 4, hp: 14, totalHp: 14, defence: 1, speed: 6 });
    attacker.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('sickle'), attacker);
    return attacker;
}

describe('the sickle weapon', () => {
    it('is a weapon that adds +4 attack', () => {
        const entry = DEFAULT_ITEM_TABLE.get('sickle')!;
        expect(entry.category).toBe('weapon');
        expect(entry.slot).toBe('weapon');
        expect(entry.effects).toEqual([{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 4 }]);
    });

    it('applies Bleeding to the defender when the hit deals damage', () => {
        const attacker = sickleFarmer();
        const defender = character('goblin', { hp: 100, totalHp: 100, defence: 0, magicDefence: 0, speed: 5 });

        const outcome = resolveGeneralAttack(attacker, defender, noCrit);
        expect(outcome.damage).toBeGreaterThan(0);

        const statuses = Array.from(defender.statusManager.statuses.values());
        expect(statuses).toHaveLength(1);
        expect(statuses[0].definition.name).toBe('Bleeding');
        expect(statuses[0].definition.duration).toEqual({ type: 'TEMPORAL', value: 3 });
    });

    it('a parry that zeroes the damage skips the bleeding entirely', () => {
        const attacker = sickleFarmer();
        const defender = character('goblin', { hp: 100, totalHp: 100, defence: 0, magicDefence: 0, speed: 5 });
        addReaction(defender, () => ({ damage: 0, reflect: 0, note: 'parried!' }));

        const outcome = resolveGeneralAttack(attacker, defender, noCrit);
        expect(outcome.damage).toBe(0);
        expect(outcome.note).toContain('parried');
        expect(defender.statusManager.statuses.size).toBe(0);
    });

    it('bleeding deals 1 fixed damage at the end of each turn, for 3 turns', () => {
        const goblin = character('goblin', { hp: 10, totalHp: 10, defence: 0, magicDefence: 0, speed: 5 });
        goblin.statusManager.addStatusInstance(new StatusInstance({ definition: bleedingStatus() }));

        goblin.statusManager.trigger('after_turn');
        expect(goblin.stats.hp).toBe(9);
        goblin.statusManager.trigger('after_turn');
        expect(goblin.stats.hp).toBe(8);
        goblin.statusManager.trigger('after_turn');
        expect(goblin.stats.hp).toBe(7);

        // expired after 3 ticks: no further damage
        expect(goblin.statusManager.statuses.size).toBe(0);
        goblin.statusManager.trigger('after_turn');
        expect(goblin.stats.hp).toBe(7);
    });

    it('bleeding never drops hp below zero and marks the character dead', () => {
        const goblin = character('goblin', { hp: 1, totalHp: 10, defence: 0, magicDefence: 0, speed: 5 });
        goblin.statusManager.addStatusInstance(new StatusInstance({ definition: bleedingStatus() }));

        goblin.statusManager.trigger('after_turn');
        expect(goblin.stats.hp).toBe(0);
        expect(goblin.stats.isAlive).toBe(0);
    });

    it('re-hitting refreshes the bleeding instead of stacking it', () => {
        const attacker = sickleFarmer();
        const defender = character('goblin', { hp: 1000, totalHp: 1000, defence: 0, magicDefence: 0, speed: 5 });

        resolveGeneralAttack(attacker, defender, noCrit); // bleeding: 3 turns
        defender.statusManager.trigger('after_turn'); // 2 turns left, hp -1

        resolveGeneralAttack(attacker, defender, noCrit); // refresh back to 3
        expect(defender.statusManager.statuses.size).toBe(1);

        defender.statusManager.trigger('after_turn');
        defender.statusManager.trigger('after_turn');
        expect(defender.statusManager.statuses.size).toBe(1); // still 1 left
        defender.statusManager.trigger('after_turn');
        expect(defender.statusManager.statuses.size).toBe(0); // refreshed timer ran out
    });
});
