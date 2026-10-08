import { Character, Stats } from '../src';
import { WorldSession } from '../worldTest/core/session';
import {
    effectiveRangeOf,
    reachableRows,
    reachableTargets,
    rowEntriesOf,
} from '../worldTest/core/combat/range';
import { jobOfCharacter } from '../worldTest/core/constants/jobs';
import { equippedItemsOf } from '../worldTest/core/equipment/loadout';
import { DEFAULT_ITEM_TABLE } from '../worldTest/core/items';

function character(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('attack reach', () => {
    it('uses each fighter\'s own chosen row', () => {
        const front = character('front', { hp: 10, totalHp: 10 });
        const back = character('back', { hp: 10, totalHp: 10 });
        front.position = 'front';
        back.position = 'back';
        expect(rowEntriesOf([front, back]).map((entry) => entry.row)).toEqual(['front', 'back']);
        // default position is the front row
        expect(rowEntriesOf([character('fresh', { hp: 10, totalHp: 10 })]).map((entry) => entry.row)).toEqual(['front']);
    });

    it('short reaches only the closest filled row', () => {
        expect(reachableRows('short', ['front', 'center', 'back'])).toEqual(['front']);
        expect(reachableRows('short', ['center', 'back'])).toEqual(['center']);
        expect(reachableRows('short', ['back'])).toEqual(['back']);
        expect(reachableRows('short', [])).toEqual([]);
    });

    it('long reaches the closest filled row and the next one', () => {
        expect(reachableRows('long', ['front', 'center', 'back'])).toEqual(['front', 'center']);
        expect(reachableRows('long', ['center', 'back'])).toEqual(['center', 'back']);
        expect(reachableRows('long', ['front'])).toEqual(['front']);
    });

    it('all reaches every filled row', () => {
        expect(reachableRows('all', ['front', 'center', 'back'])).toEqual(['front', 'center', 'back']);
    });

    it('filters targets by reachable row and alive state', () => {
        const front = character('front', { hp: 10, totalHp: 10 });
        const center = character('center', { hp: 10, totalHp: 10 });
        const back = character('back', { hp: 10, totalHp: 10 });
        const deadFront = character('dead', { hp: 0, totalHp: 10 });
        const entries = [
            { character: front, row: 'front' as const },
            { character: deadFront, row: 'front' as const },
            { character: center, row: 'center' as const },
            { character: back, row: 'back' as const },
        ];

        expect(reachableTargets('short', entries).map((entry) => entry.id)).toEqual(['front']);
        expect(reachableTargets('long', entries).map((entry) => entry.id).sort()).toEqual(['center', 'front']);
        expect(reachableTargets('all', entries).map((entry) => entry.id).sort()).toEqual(['back', 'center', 'front']);
    });
});

describe('weapon reach and gear', () => {
    it('the equipped weapon overrides the character reach', () => {
        const archer = character('archer', { hp: 12, totalHp: 12, attack: 5, defence: 0, speed: 8 });
        expect(effectiveRangeOf(archer)).toBe('short'); // bare hands
        archer.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('bow'), archer);
        expect(effectiveRangeOf(archer)).toBe('all');
    });

    it('the Order weapons carry their bonuses and reach', () => {
        const sword = DEFAULT_ITEM_TABLE.get('sword')!;
        expect(sword.rangeOf).toBe('short');
        expect(sword.effects).toEqual([{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 4 }]);

        const bow = DEFAULT_ITEM_TABLE.get('bow')!;
        expect(bow.rangeOf).toBe('all');
        expect(bow.effects).toEqual([{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 3 }]);

        const staff = DEFAULT_ITEM_TABLE.get('staff')!;
        expect(staff.rangeOf).toBe('long');
        expect(staff.elements).toEqual([{ element: 'arcane', attackValue: 5 }]);
    });

    it('the recruits wear their class weapons', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const wornIds = (id: string) =>
            equippedItemsOf(session.roster.character(id)!).map((item) => item.id);
        expect(wornIds('archer_0')).toContain('bow');
        expect(wornIds('arturo')).toContain('staff');
        expect(wornIds('soldier_0')).toContain('sword');
        expect(session.roster.character('archer_0')!.getStat('attack')).toBe(10); // 5 + job 2 + bow 3
        expect(session.roster.character('soldier_0')!.getStat('attack')).toBe(13); // 6 + job 3 + sword 4
    });
});

describe('the squad', () => {
    it('holds the player plus up to five more (the six-person squad)', () => {
        const session = new WorldSession({ random: () => 0.5 });
        expect(session.squadLimit()).toBe(6);

        const ids = ['player', 'arturo', 'archer_0', 'soldier_0', 'soldier_1', 'healer_0'];
        const result = session.setActiveParty(ids);
        expect(result.ok).toBe(true);
        expect(session.roster.activeIds()).toEqual(ids);
    });

    it('classifies the recruits for the camp roster', () => {
        const session = new WorldSession({ random: () => 0.5 });
        expect(jobOfCharacter('archer_0')?.title).toBe('Archer');
        expect(jobOfCharacter('healer_0')?.title).toBe('Healer');
        expect(jobOfCharacter('arturo')?.title).toBe('Healer');
        expect(jobOfCharacter('soldier_0')?.title).toBe('Soldier');
        // The player enlisted as a soldier too.
        expect(jobOfCharacter('player')?.title).toBe('Soldier');
        // The camp roster never includes the player.
        const roster = session.roster.all().filter((character) => character.id !== 'player');
        expect(roster).toHaveLength(12);
    });
});

describe('auto formation rows', () => {
    it('places recruits in the row their weapon belongs to when added', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.setActiveParty(['player', 'archer_0', 'arturo', 'soldier_0']);

        expect(session.roster.character('archer_0')!.position).toBe('back'); // bow: 'all'
        expect(session.roster.character('arturo')!.position).toBe('center'); // staff: 'long'
        expect(session.roster.character('soldier_0')!.position).toBe('front'); // sword: 'short'
        expect(session.team.getCharacter('player')!.position).toBe('front'); // sword: 'short'
    });

    it('only re-rows when a character is added to the team', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.setActiveParty(['player', 'soldier_0']);
        const soldier = session.roster.character('soldier_0')!;
        expect(soldier.position).toBe('front'); // the sword

        // Equipping and unequipping never touch the row.
        session.setJob('soldier_0', 'archer'); // strips the sword
        expect(soldier.position).toBe('front');
        session.team.inventory.addItem(DEFAULT_ITEM_TABLE.createItem('bow'), 1);
        session.equipTo('bow', 'soldier_0');
        expect(soldier.position).toBe('front'); // no auto-swap

        // Taking him out and adding him back places him by his reach.
        session.setActiveParty(['player']);
        session.setActiveParty(['player', 'soldier_0']);
        expect(soldier.position).toBe('back'); // the bow: 'all'
    });

    it('a manual formation choice stands until the weapon changes', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.setActiveParty(['player', 'archer_0']);
        const archer = session.roster.character('archer_0')!;
        expect(archer.position).toBe('back');

        session.setPosition('archer_0', 'front'); // manual override
        expect(archer.position).toBe('front');

        // Re-setting the party without re-adding him keeps the manual row.
        session.setActiveParty(['player', 'archer_0']);
        expect(archer.position).toBe('front');
    });
});
