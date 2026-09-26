import { Character, Stats } from '../src';
import type { Statistics } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { auraEffectNameOf, syncAuras } from '../worldTest/core/combat/aura';
import { clearStatuses, revolutionaryAuraStatus } from '../worldTest/core/statuses';
import { hasStatusNamed } from '../worldTest/core/skills';
import { FIGHTS } from '../worldTest/core/config/fights';

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('team auras', () => {
    it('grants the aura bonuses to the whole team while the holder lives', () => {
        const boss = character('boss', { hp: 100, totalHp: 100, attack: 10, speed: 5 });
        const farmerA = character('farmerA', { hp: 50, totalHp: 50, attack: 4, speed: 5 });
        const farmerB = character('farmerB', { hp: 50, totalHp: 50, attack: 4, speed: 5 });
        boss.statusManager.addStatusInstance(
            new StatusInstance({ definition: revolutionaryAuraStatus() }),
        );

        syncAuras([boss, farmerA, farmerB]);

        const effect = auraEffectNameOf('Revolutionary Aura');
        for (const member of [boss, farmerA, farmerB]) {
            expect(hasStatusNamed(member, effect)).toBe(true);
        }
        expect(farmerA.getStat('attack')).toBe(14); // 4 + 10
        expect(farmerA.getStat('speed')).toBe(8); // 5 + 3
        expect(boss.getStat('attack')).toBe(20); // the boss is part of the team
    });

    it('ends when the holder dies', () => {
        const boss = character('boss', { hp: 100, totalHp: 100, attack: 10, speed: 5 });
        const farmer = character('farmer', { hp: 50, totalHp: 50, attack: 4, speed: 5 });
        boss.statusManager.addStatusInstance(
            new StatusInstance({ definition: revolutionaryAuraStatus() }),
        );
        syncAuras([boss, farmer]);
        expect(farmer.getStat('attack')).toBe(14);

        boss.stats.hp = 0;
        boss.stats.isAlive = 0;
        syncAuras([boss, farmer]);

        expect(farmer.getStat('attack')).toBe(4);
        expect(hasStatusNamed(farmer, auraEffectNameOf('Revolutionary Aura'))).toBe(false);
    });

    it('is idempotent and cleared with the battle statuses', () => {
        const boss = character('boss', { hp: 100, totalHp: 100, attack: 10, speed: 5 });
        const farmer = character('farmer', { hp: 50, totalHp: 50, attack: 4, speed: 5 });
        boss.statusManager.addStatusInstance(
            new StatusInstance({ definition: revolutionaryAuraStatus() }),
        );
        syncAuras([boss, farmer]);
        syncAuras([boss, farmer]); // no stacking
        expect(farmer.getStat('attack')).toBe(14);

        // The battle-end cleanup removes both the aura and its effects.
        clearStatuses(farmer, { keepPersistent: true });
        clearStatuses(boss, { keepPersistent: true });
        expect(farmer.getStat('attack')).toBe(4);
        expect(hasStatusNamed(boss, 'Revolutionary Aura')).toBe(false);
    });

    it('the farmers_boss fight brings the king, his sickle and eight men', () => {
        const enemies = FIGHTS.farmers_boss.enemies();
        expect(enemies).toHaveLength(9);

        const boss = enemies[0];
        expect(boss.id).toBe('farmer_boss');
        expect(boss.name).toBe('The Farmer King');
        expect(boss.stats.attack).toBe(14);
        expect(boss.equipment.get('weapon')?.id).toBe('sickle');
        expect(hasStatusNamed(boss, 'Revolutionary Aura')).toBe(true);

        for (const enemy of enemies) {
            expect(enemy.equipment.get('weapon')?.id).toBe('sickle');
        }
    });
});
