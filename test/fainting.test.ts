import { WorldSession } from '../worldTest/core/session';
import { FAINT } from '../worldTest/core/fainting';
import { clearStatuses } from '../worldTest/core/statuses';
import { hasStatusNamed } from '../worldTest/core/skills';

function battleSession(): WorldSession {
    const session = new WorldSession({ random: () => 0.5 });
    // The renegade league squad limit lets us travel with recruits.
    session.missions.start('renegade_league');
    return session;
}

function down(session: WorldSession, characterId: string): void {
    const character = session.roster.character(characterId) ?? session.team.getCharacter(characterId);
    if (character) {
        character.stats.hp = 0;
        character.stats.isAlive = 0;
    }
}

describe('fainting', () => {
    it('a teammate that falls in a won battle is left behind as a corpse', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        expect(session.roster.activeIds()).toEqual(['player', 'soldier_0']);

        down(session, 'soldier_0');
        const soldier = session.roster.character('soldier_0')!;
        const end = session.finishCombat('won', { placeId: 'farm' });

        expect(end.message).toContain(`${soldier.name} was left behind`);
        expect(session.isFainted('soldier_0')).toBe(true);
        expect(session.corpsesAt('farm').map((entry) => entry.character.id)).toEqual(['soldier_0']);
        expect(session.roster.activeIds()).toEqual(['player']); // the corpse left the squad
        expect(session.corpsesAt('farm')[0].daysLeft).toBe(FAINT.corpseDays);
    });

    it('the player never faints: they always drag themselves back', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'player');
        session.finishCombat('won', { placeId: 'farm' });

        expect(session.isFainted('player')).toBe(false);
        expect(session.team.getCharacter('player')).toBeDefined();
    });

    it('fleeing also leaves the fallen behind', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'soldier_0');
        const end = session.finishCombat('fled', { placeId: 'farm' });

        expect(end.message).toContain('left behind');
        expect(session.isFainted('soldier_0')).toBe(true);
        expect(session.corpsesAt('farm')).toHaveLength(1);
    });

    it('a party member picks the corpse up with the persistent penalties', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'soldier_0');
        session.finishCombat('won', { placeId: 'farm' });

        const player = session.team.getCharacter('player')!;
        const result = session.pickUpCorpse('soldier_0', 'player');
        expect(result.ok).toBe(true);
        expect(hasStatusNamed(player, 'Corpse Carrying')).toBe(true);

        // The penalties are live: attack 11 -> 7.5 (7 base + sword 4,
        // halved), speed 6 -> 2.4.
        expect(player.getStat('attack')).toBeCloseTo(7.5, 2);
        expect(player.getStat('speed')).toBeCloseTo(2.4, 2);

        // The corpse travels with the carrier now.
        expect(session.corpsesAt('farm')).toHaveLength(0);
        expect(session.faints.carriedBy('player')?.characterId).toBe('soldier_0');

        // The penalties survive the battle-end cleanup.
        clearStatuses(player, { keepPersistent: true });
        expect(hasStatusNamed(player, 'Corpse Carrying')).toBe(true);
    });

    it('each character carries at most one corpse', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0', 'archer_0']);
        down(session, 'soldier_0');
        down(session, 'archer_0');
        session.finishCombat('won', { placeId: 'farm' });

        expect(session.pickUpCorpse('soldier_0', 'player').ok).toBe(true);
        const second = session.pickUpCorpse('archer_0', 'player');
        expect(second.ok).toBe(false);
        expect(second.message).toContain('already carries');
    });

    it('a fallen carrier drops the corpse it hauled', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0', 'archer_0']);
        down(session, 'soldier_0');
        session.finishCombat('won', { placeId: 'farm' });
        session.pickUpCorpse('soldier_0', 'archer_0');

        // The archer falls in the next battle: both corpses lie here.
        session.setActiveParty(['player', 'archer_0']);
        down(session, 'archer_0');
        session.finishCombat('won', { placeId: 'farm' });

        expect(session.corpsesAt('farm').map((entry) => entry.character.id).sort())
            .toEqual(['archer_0', 'soldier_0']);
        expect(session.faints.carriedBy('archer_0')).toBeUndefined();
    });

    it('the fountain revives a corpse hauled into the camp', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'soldier_0');
        session.finishCombat('won', { placeId: 'farm' });
        session.pickUpCorpse('soldier_0', 'player');

        // Travel to the camp with the corpse.
        session.travel('camp');
        const candidates = session.fountainCandidates();
        expect(candidates.map((entry) => entry.character.id)).toEqual(['soldier_0']);

        const revive = session.reviveAtFountain('soldier_0');
        expect(revive.ok).toBe(true);

        const soldier = session.roster.character('soldier_0')!;
        expect(soldier.stats.hp).toBe(soldier.stats.totalHp);
        expect(soldier.stats.isAlive).toBe(1);
        expect(session.isFainted('soldier_0')).toBe(false);
        expect(hasStatusNamed(session.team.getCharacter('player')!, 'Corpse Carrying')).toBe(false);

        // Back in business.
        session.setActiveParty(['player', 'soldier_0']);
        expect(session.roster.activeIds()).toEqual(['player', 'soldier_0']);
    });

    it('the fountain only revives corpses that are at the camp', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'soldier_0');
        session.finishCombat('won', { placeId: 'farm' });

        const away = session.reviveAtFountain('soldier_0');
        expect(away.ok).toBe(false);
        expect(away.message).toContain('not at the fountain');
    });

    it('a corpse left for a week means the character is dead for good', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'soldier_0');
        session.finishCombat('won', { placeId: 'farm' });

        // One day less than the week: still revivable.
        session.calendar.skip(FAINT.corpseDays - 1);
        expect(session.corpsesAt('farm')).toHaveLength(1);

        // The last day passes with a travel: the corpse is lost.
        const travel = session.travel('camp');
        expect(travel.message ?? '').toContain('died');
        expect(session.isFainted('soldier_0')).toBe(false);
        expect(session.faints.isDeceased('soldier_0')).toBe(true);
        expect(session.roster.character('soldier_0')).toBeUndefined();
        expect(session.corpsesAt('farm')).toHaveLength(0);

        // The fallen soldier's gear returned to the shared inventory.
        expect(session.team.inventory.getItemSlotByItemId('sword')?.totalQuantity).toBe(1);

        // The camp no longer hosts them.
        expect(session.npcsAt('camp').map((npc) => npc.id)).not.toContain('soldier_0');
    });

    it('an expired corpse drops off its carrier without the penalties', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'soldier_0');
        session.finishCombat('won', { placeId: 'farm' });
        session.pickUpCorpse('soldier_0', 'player');

        session.calendar.skip(FAINT.corpseDays);
        session.travel('camp'); // the week runs out on the road

        const player = session.team.getCharacter('player')!;
        expect(hasStatusNamed(player, 'Corpse Carrying')).toBe(false);
        expect(session.faints.isDeceased('soldier_0')).toBe(true);
    });

    it('fainted records and carry penalties survive a save/load', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'soldier_0');
        session.finishCombat('won', { placeId: 'farm' });
        session.pickUpCorpse('soldier_0', 'player');

        const saved = session.exportSave();
        const restored = WorldSession.fromSave(saved);

        expect(restored.isFainted('soldier_0')).toBe(true);
        expect(restored.roster.activeIds()).toEqual(['player']);
        const player = restored.team.getCharacter('player')!;
        expect(hasStatusNamed(player, 'Corpse Carrying')).toBe(true);
        expect(player.getStat('attack')).toBeCloseTo(7.5, 2); // penalties restored

        // The fountain still works after the round trip.
        restored.currentPlaceId = 'camp';
        expect(restored.reviveAtFountain('soldier_0').ok).toBe(true);
        expect(restored.isFainted('soldier_0')).toBe(false);
    });

    it('a fainted character cannot join the squad until revived', () => {
        const session = battleSession();
        session.setActiveParty(['player', 'soldier_0']);
        down(session, 'soldier_0');
        session.finishCombat('won', { placeId: 'farm' });

        const result = session.setActiveParty(['player', 'soldier_0']);
        expect(result.ok).toBe(true);
        expect(session.roster.activeIds()).toEqual(['player']);
    });
});
