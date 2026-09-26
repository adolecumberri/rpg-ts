import {
    ARCHER_JOB,
    ADVENTURER_JOB,
    HEALER_JOB,
    SOLDIER_JOB,
    heldJobOf,
    jobOfCharacter,
} from '../worldTest/core/constants/jobs';
import { WorldSession } from '../worldTest/core/session';
import { DEFAULT_ITEM_TABLE } from '../worldTest/core/items';
import { resolveGeneralAttack } from '../worldTest/core/damage/general';
import { Character, Stats } from '../src';

const noCrit = () => 1;

function defender(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('the jobs', () => {
    it('map the camp recruits and the player to their jobs', () => {
        expect(jobOfCharacter('player')).toBe(SOLDIER_JOB);
        expect(jobOfCharacter('archer_0')).toBe(ARCHER_JOB);
        expect(jobOfCharacter('archer_1')).toBe(ARCHER_JOB);
        expect(jobOfCharacter('healer_0')).toBe(HEALER_JOB);
        expect(jobOfCharacter('arturo')).toBe(HEALER_JOB);
        expect(jobOfCharacter('soldier_0')).toBe(SOLDIER_JOB);
        expect(jobOfCharacter('lord_son')).toBeUndefined();
    });

    it('carries the stat bonuses of each job', () => {
        expect(SOLDIER_JOB.statBonuses).toEqual({ attack: 3, defence: 2 });
        expect(ARCHER_JOB.statBonuses).toEqual({ attack: 2, speed: 2 });
        expect(HEALER_JOB.statBonuses).toEqual({ magic: 5, defence: -1 });
        expect(ADVENTURER_JOB.statBonuses).toEqual({});
    });

    it('enforces the sword/bow/staff triangle', () => {
        expect(SOLDIER_JOB.allowsWeapon('sword')).toBe(true);
        expect(SOLDIER_JOB.allowsWeapon('bow')).toBe(false);
        expect(SOLDIER_JOB.allowsWeapon('staff')).toBe(false);

        expect(ARCHER_JOB.allowsWeapon('bow')).toBe(true);
        expect(ARCHER_JOB.allowsWeapon('sword')).toBe(false);
        expect(ARCHER_JOB.allowsWeapon('staff')).toBe(false);

        expect(HEALER_JOB.allowsWeapon('staff')).toBe(true);
        expect(HEALER_JOB.allowsWeapon('sword')).toBe(false);
        expect(HEALER_JOB.allowsWeapon('bow')).toBe(false);

        // The adventurer wields everything, and untyped gear is always fine.
        expect(ADVENTURER_JOB.allowsWeapon('sword')).toBe(true);
        expect(ADVENTURER_JOB.allowsWeapon('bow')).toBe(true);
        expect(ADVENTURER_JOB.allowsWeapon('staff')).toBe(true);
        expect(ARCHER_JOB.allowsWeapon(undefined)).toBe(true);
    });

    it('the job weapons match the item table types', () => {
        expect(DEFAULT_ITEM_TABLE.get('sword')!.weaponType).toBe('sword');
        expect(DEFAULT_ITEM_TABLE.get('bow')!.weaponType).toBe('bow');
        expect(DEFAULT_ITEM_TABLE.get('staff')!.weaponType).toBe('staff');
    });

    it('recruits learn their job skills on top of the defaults', () => {
        const session = new WorldSession({ random: () => 0.5 });
        expect(session.availableSkillIds(session.roster.character('archer_0')!)).toEqual([
            'defend', 'fast_draw', 'weak_point',
        ]);
        expect(session.availableSkillIds(session.roster.character('arturo')!)).toEqual([
            'defend', 'dispel', 'cure',
        ]);
        expect(session.availableSkillIds(session.roster.character('soldier_0')!)).toEqual([
            'defend', 'impetu', 'first_aid',
        ]);
        // The player enlisted as a soldier and carries the same kit.
        expect(session.availableSkillIds(session.team.getCharacter('player')!)).toEqual([
            'defend', 'impetu', 'first_aid',
        ]);
    });

    it('magic is magic power and magical damage passes through magicDefence', () => {
        const session = new WorldSession({ random: () => 0.5 });
        // Arturo: healer job (+5 magic), staff (+1 attack, +5 arcane).
        const arturo = session.roster.character('arturo')!;
        expect(arturo.getStat('attack')).toBe(3); // 2 + staff 1
        // The magical arcane component carries the magic power: 5 + 5.
        const armored = defender('armored', { defence: 99, magicDefence: 0 });
        expect(resolveGeneralAttack(arturo, armored, noCrit).damage).toBeCloseTo(11.01, 2); // 3*50/149 + 10

        // The same hit against magicDefence: the magical part is the one reduced.
        const warded = defender('warded', { defence: 0, magicDefence: 50 });
        expect(resolveGeneralAttack(arturo, warded, noCrit).damage).toBeCloseTo(8, 2); // 3 + 10*50/100
    });
});

describe('job assignment', () => {
    it('applies the job bonuses straight to the character stats at creation', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const soldier = session.roster.character('soldier_0')!;
        expect(soldier.stats.attack).toBe(9); // 6 + job 3
        expect(soldier.stats.defence).toBe(5); // 3 + job 2
        expect(heldJobOf(soldier)).toBe(SOLDIER_JOB);

        const archer = session.roster.character('archer_0')!;
        expect(archer.stats.attack).toBe(7); // 5 + job 2
        expect(archer.getStat('speed')).toBe(10); // 8 + job 2

        const healer = session.roster.character('arturo')!;
        expect(healer.getStat('magic')).toBe(5);
        expect(healer.stats.defence).toBe(-1);
    });

    it('swapping a job removes the old bonuses and adds the new ones', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const soldier = session.roster.character('soldier_0')!;

        const result = session.setJob('soldier_0', 'archer');
        expect(result.ok).toBe(true);
        // 6 base + 3 job - 3 job + 2 job
        expect(soldier.stats.attack).toBe(8);
        expect(soldier.stats.defence).toBe(3); // back to base
        expect(soldier.getStat('speed')).toBe(7); // 5 default + 2
        expect(heldJobOf(soldier)).toBe(ARCHER_JOB);

        // The new job's skill kit follows immediately.
        expect(session.availableSkillIds(soldier)).toEqual(['defend', 'fast_draw', 'weak_point']);

        // Swapping back restores the original numbers.
        session.setJob('soldier_0', 'soldier');
        expect(soldier.stats.attack).toBe(9);
        expect(soldier.stats.defence).toBe(5);
        expect(soldier.getStat('speed')).toBe(5);
    });

    it('unequips the weapons the new job cannot wield', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.setActiveParty(['player', 'soldier_0']); // adopts the worn sword

        // The soldier cannot keep the sword as an archer.
        const result = session.setJob('soldier_0', 'archer');
        expect(result.ok).toBe(true);
        expect(result.message).toContain('Unequipped: Sword');
        expect(session.roster.character('soldier_0')!.equipment.get('weapon')).toBeUndefined();

        // The sword is back in the shared inventory as available.
        const slot = session.team.inventory.getItemSlotByItemId('sword');
        expect(slot?.totalQuantity).toBe(1);
        expect(slot?.quantity).toBe(1);

        // Non-weapon slots stay untouched.
        session.team.inventory.addItem(DEFAULT_ITEM_TABLE.createItem('sack'), 1);
        session.equipTo('sack', 'soldier_0');
        session.setJob('soldier_0', 'soldier');
        expect(session.roster.character('soldier_0')!.equipment.get('bag')?.id).toBe('sack');
    });

    it('every character can swap to any job, the player included', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const player = session.team.getCharacter('player')!;
        expect(heldJobOf(player)).toBe(SOLDIER_JOB);
        expect(player.stats.attack).toBe(7); // 4 + job 3
        expect(player.stats.defence).toBe(3); // 1 + job 2

        expect(session.setJob('player', 'archer').ok).toBe(true);
        expect(heldJobOf(player)).toBe(ARCHER_JOB);
        expect(player.stats.attack).toBe(6); // 7 - 3 + 2
        expect(player.getStat('speed')).toBe(8); // 6 + job 2

        // And on to the adventurer, which carries no bonuses.
        expect(session.setJob('player', 'adventurer').ok).toBe(true);
        expect(player.stats.attack).toBe(4);
        expect(player.stats.defence).toBe(1);
        expect(player.getStat('speed')).toBe(6);
    });

    it('persists the held job and its stats through a save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.setJob('soldier_0', 'archer');
        session.setJob('archer_0', 'healer');
        const saved = session.exportSave();
        const restored = WorldSession.fromSave(saved);

        const swappedSoldier = restored.roster.character('soldier_0')!;
        expect(heldJobOf(swappedSoldier)).toBe(ARCHER_JOB);
        expect(swappedSoldier.stats.attack).toBe(8); // bonuses persisted
        expect(swappedSoldier.getStat('speed')).toBe(7);
        expect(restored.availableSkillIds(swappedSoldier)).toEqual(['defend', 'fast_draw', 'weak_point']);

        const swappedArcher = restored.roster.character('archer_0')!;
        expect(heldJobOf(swappedArcher)).toBe(HEALER_JOB);
        expect(swappedArcher.getStat('magic')).toBe(5);
        expect(swappedArcher.equipment.get('weapon')).toBeUndefined(); // bow stripped

        // Swapping again after the load keeps the math consistent.
        restored.setJob('soldier_0', 'soldier');
        expect(swappedSoldier.stats.attack).toBe(9);
        expect(swappedSoldier.stats.defence).toBe(5);
        expect(swappedSoldier.getStat('speed')).toBe(5);
    });

    it('self-heals old saves by adopting the default job and its bonuses', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const saved = session.exportSave();
        // Old saves predate jobs: strip the fields and revert the
        // stats to their pre-job values (as an old save would have).
        for (const entry of [...saved.team, ...(saved.roster ?? [])]) {
            delete entry.jobId;
            delete entry.extraStats;
            if (entry.id === 'soldier_0') {
                entry.attack -= 3; // 13 with bonuses -> 10 without
                entry.defence -= 2;
            }
        }
        const restored = WorldSession.fromSave(saved);

        const soldier = restored.roster.character('soldier_0')!;
        expect(heldJobOf(soldier)).toBe(SOLDIER_JOB);
        // The self-heal applies the default job bonuses exactly once
        // (raw stats: 6 + job 3 attack, 3 + job 2 defence).
        expect(soldier.stats.attack).toBe(9);
        expect(soldier.stats.defence).toBe(5);
        expect(soldier.getStat('speed')).toBe(5); // speed was not saved back then
    });
});
