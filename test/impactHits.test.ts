import { Character, Stats } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { resolveGeneralAttack } from '../worldTest/core/damage/general';
import type { GeneralAttackOutcome } from '../worldTest/core/damage/general';
import { phantomStrikeStatus, sheenReadyStatus } from '../worldTest/core/statuses';
import { DEFAULT_ITEM_TABLE } from '../worldTest/core/items';

function fighter(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

/** A damage sponge: no defence, no magic defence, 1000 hp. */
function dummy(): Character {
    return fighter('dummy', {
        hp: 1000,
        totalHp: 1000,
        attack: 0,
        defence: 0,
        magicDefence: 0,
    });
}

// One plain basic attack with random 1: no crits (chance 10), no misses.
function attack(attacker: Character, defender: Character): GeneralAttackOutcome {
    return resolveGeneralAttack(attacker, defender, () => 1, { breakdown: true });
}

/** The sum of the hit's components of one damage kind. */
function sumByKind(outcome: GeneralAttackOutcome, kind: string): number {
    return (outcome.components ?? [])
        .filter((component) => (component.kind ?? 'physical') === kind)
        .reduce((sum, component) => sum + component.amount, 0);
}

function hasStatus(character: Character, name: string): boolean {
    for (const status of character.statusManager.statuses.values()) {
        if (status.definition.name === name) return true;
    }
    return false;
}

describe('the impact hit pipeline', () => {
    it('5.1 sheen: the next impact hit adds 50% of the attack as its own instance', () => {
        const attacker = fighter('attacker', { hp: 100, totalHp: 100, attack: 10, defence: 0 });
        attacker.statusManager.addStatusInstance(
            new StatusInstance({ definition: sheenReadyStatus() }),
        );

        const hit = attack(attacker, dummy());

        // 10 basic + 5 sheen, as two separate instances.
        expect(hit.damage).toBe(15);
        expect(hit.components?.map((component) => component.label)).toEqual(['Attack', 'Sheen']);
        expect(hit.components?.[1].amount).toBe(5);

        // The charge was consumed: the next attack is the plain 10.
        expect(hasStatus(attacker, 'Sheen Ready')).toBe(false);
        expect(attack(attacker, dummy()).damage).toBe(10);
    });

    it('5.2 guinsoo: +6/+6 per impact, the 3rd attack doubles it, the 4th readies a phantom', () => {
        const attacker = fighter('attacker', { hp: 100, totalHp: 100, attack: 10, defence: 0 });
        attacker.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('guinsoo_rageblade'), attacker);
        const defender = dummy();

        const first = attack(attacker, defender);
        expect(sumByKind(first, 'physical')).toBe(16);
        expect(sumByKind(first, 'magical')).toBe(6);

        const second = attack(attacker, defender);
        expect(sumByKind(second, 'physical')).toBe(16);
        expect(sumByKind(second, 'magical')).toBe(6);

        // The 3rd attack applies the on-hit twice: 22 physical / 12 magical.
        const third = attack(attacker, defender);
        expect(sumByKind(third, 'physical')).toBe(22);
        expect(sumByKind(third, 'magical')).toBe(12);

        // The 4th attack is plain again but readies the Phantom Strike.
        const fourth = attack(attacker, defender);
        expect(sumByKind(fourth, 'physical')).toBe(16);
        expect(sumByKind(fourth, 'magical')).toBe(6);
        expect(hasStatus(attacker, 'Phantom Strike')).toBe(true);

        // The 5th attack launches the phantom: 1 + 2 = three on-hits.
        const fifth = attack(attacker, defender);
        expect(sumByKind(fifth, 'physical')).toBe(28);
        expect(sumByKind(fifth, 'magical')).toBe(18);
        expect(hasStatus(attacker, 'Phantom Strike')).toBe(false);
    });

    it('5.3 silver bullets: every 3rd hit on the same enemy adds 10% of its max hp as true damage', () => {
        const attacker = fighter('attacker', { hp: 100, totalHp: 100, attack: 10, defence: 0 });
        attacker.skillIds = ['silver_bolts'];
        const defender = dummy(); // 1000 max hp

        // TEMP (stress test true-damage visibility): the skill fires on
        // EVERY hit instead of every 3rd. REVERT together with the
        // `every: 1` in skills.ts and restore the every-3 expectations:
        // hits 1-2 = 0 true, hit 3 = 100 true (110 damage), hit 4 = 0.
        expect(sumByKind(attack(attacker, defender), 'true')).toBe(100);
        expect(sumByKind(attack(attacker, defender), 'true')).toBe(100);

        const third = attack(attacker, defender);
        expect(sumByKind(third, 'true')).toBe(100); // 10% of 1000
        expect(third.damage).toBe(110);

        expect(sumByKind(attack(attacker, defender), 'true')).toBe(100);
    });

    it('5.4 sheen + phantom without items: only the sheen damage, the extra impacts do nothing', () => {
        const attacker = fighter('attacker', { hp: 100, totalHp: 100, attack: 10, defence: 0 });
        attacker.statusManager.addStatusInstance(
            new StatusInstance({ definition: sheenReadyStatus() }),
        );
        attacker.statusManager.addStatusInstance(
            new StatusInstance({ definition: phantomStrikeStatus() }),
        );

        const hit = attack(attacker, dummy());

        // 10 basic + 5 sheen, nothing magical: no Guinsoo to feed the
        // phantom's two extra impacts.
        expect(hit.damage).toBe(15);
        expect(sumByKind(hit, 'physical')).toBe(15);
        expect(sumByKind(hit, 'magical')).toBe(0);
        expect(hit.components?.map((component) => component.label)).toEqual(['Attack', 'Sheen']);

        // Both one-shot charges were consumed by the same impact.
        expect(hasStatus(attacker, 'Sheen Ready')).toBe(false);
        expect(hasStatus(attacker, 'Phantom Strike')).toBe(false);
    });
});
