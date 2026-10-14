import { WorldSession } from '../worldTest/core/session';
import { CHATS } from '../worldTest/core/config/chats';
import { FLAGS } from '../worldTest/core/constants/flags';
import { FIGHTS } from '../worldTest/core/config/fights';
import { equippedItemsOf } from '../worldTest/core/equipment/loadout';

// ---------------------------------------------------------------------------
// Act 1 as data: the opening (captain's welcome + branch choice), the
// sparring trail (three single matches, then the captain — win flags,
// map unlock) and the caza menor (boar packs, the squad vote and the
// spectral boar).
// ---------------------------------------------------------------------------

function freshSession(): WorldSession {
    return new WorldSession({ random: () => 0.5 });
}

function pickBranch(session: WorldSession, index: number): void {
    const choice = CHATS.act1_intro.lines[CHATS.act1_intro.lines.length - 1].choices![index];
    for (const effect of choice.effects) {
        session.applyStoryEffect(effect);
    }
}

describe('the act 1 opening', () => {
    it('the captain welcomes the recruit and the branch choice waits', () => {
        const session = freshSession();
        expect(session.messages.hasPending()).toBe(false);

        session.beginStory();
        expect(session.messages.remaining()).toBe(3);

        // The last line carries the three branch options.
        const intro = CHATS.act1_intro.lines;
        expect(intro[intro.length - 1].choices?.map((choice) => choice.label)).toEqual([
            '⚔️ Soldier',
            '🏹 Archer',
            '✨ Mage',
        ]);
    });

    it('choosing the archer branch re-jobs the player and leaves the flags', () => {
        const session = freshSession();
        session.beginStory();

        pickBranch(session, 1); // Archer

        const player = session.team.getCharacter('player')!;
        expect(player.jobId).toBe('archer');
        expect(session.hasFlag(FLAGS.BRANCH_CHOSEN)).toBe(true);
        expect(session.hasFlag(FLAGS.BRANCH_ARCHER)).toBe(true);
        // The sword went back to the inventory: an archer cannot wield
        // it — and the branch handed over the bow (the first loadout
        // hole now holds the archer's weapon).
        expect(player.loadout?.holes?.[0]?.id).toBe('bow');
        expect(equippedItemsOf(player).map((item) => item.id)).toContain('bow');
    });

    it('the branch hands each recruit their class weapon', () => {
        const soldier = freshSession();
        soldier.beginStory();
        pickBranch(soldier, 0);
        expect(equippedItemsOf(soldier.team.getCharacter('player')!).map((item) => item.id)).toContain('sword');

        const archer = freshSession();
        archer.beginStory();
        pickBranch(archer, 1);
        expect(equippedItemsOf(archer.team.getCharacter('player')!).map((item) => item.id)).toContain('bow');

        const mage = freshSession();
        mage.beginStory();
        pickBranch(mage, 2);
        expect(equippedItemsOf(mage.team.getCharacter('player')!).map((item) => item.id)).toContain('staff');
    });
});

describe('the sparring trail', () => {
    const sparring = [
        { missionId: 'spar_with_soldier', fightId: 'sparring_soldier', flag: FLAGS.TRAINING_WON_SOLDIER },
        { missionId: 'spar_with_mage', fightId: 'sparring_mage', flag: FLAGS.TRAINING_WON_MAGE },
        { missionId: 'spar_with_archer', fightId: 'sparring_archer', flag: FLAGS.TRAINING_WON_ARCHER },
        { missionId: 'spar_with_captain', fightId: 'sparring_captain', flag: FLAGS.TRAINING_WON_CAPTAIN },
    ];

    // Accepts and wins one sparring mission (battle queued, consumed
    // and reported to the session).
    function winSpar(session: WorldSession, missionId: string, fightId: string): void {
        expect(session.startMission(missionId)).toBe(true);
        expect(session.missionBattleReady(missionId, 'camp')).toBe(true);
        expect(session.startMissionBattle(missionId)).toBe(true);
        expect(session.pendingBattle()?.fightId).toBe(fightId);
        session.consumePendingBattle();
        session.finishCombat('won', { fightId, missionId, placeId: 'camp' });
    }

    it('is only offered once the branch is chosen', () => {
        const session = freshSession();
        expect(session.missions.newMissions('camp').map((mission) => mission.id)).not.toContain('spar_with_soldier');
        expect(session.startMission('spar_with_soldier')).toBe(false);

        session.beginStory();
        pickBranch(session, 2); // Mage
        const offered = session.missions.newMissions('camp').map((mission) => mission.id);
        expect(offered).toEqual(expect.arrayContaining([
            'spar_with_soldier',
            'spar_with_mage',
            'spar_with_archer',
        ]));
        // The captain only appears once the three are done.
        expect(offered).not.toContain('spar_with_captain');
        expect(session.startMission('spar_with_soldier')).toBe(true);
    });

    it('offers the waiting fight as a place option for every mission', () => {
        const session = freshSession();
        session.beginStory();
        pickBranch(session, 0); // Soldier

        expect(session.battleReadyMissionsAt('camp')).toEqual([]);
        expect(session.startMission('spar_with_soldier')).toBe(true);
        expect(session.battleReadyMissionsAt('camp')).toEqual([
            { missionId: 'spar_with_soldier', title: 'Sparring with the Soldier' },
        ]);
        expect(session.battleReadyMissionsAt('farm')).toEqual([]);
    });

    it('each match is its own mission: a loss still completes it', () => {
        const session = freshSession();
        session.beginStory();
        pickBranch(session, 0); // Soldier

        expect(session.startMission('spar_with_soldier')).toBe(true);
        expect(session.missionBattleReady('spar_with_soldier', 'camp')).toBe(true);
        expect(session.missionBattleReady('spar_with_soldier', 'farm')).toBe(false);
        session.startMissionBattle('spar_with_soldier');
        expect(session.pendingBattle()?.fightId).toBe('sparring_soldier');
        session.consumePendingBattle();
        session.finishCombat('lost', { fightId: 'sparring_soldier', missionId: 'spar_with_soldier', placeId: 'camp' });

        expect(session.hasFlag(FLAGS.TRAINING_WON_SOLDIER)).toBe(false);
        expect(session.missionIsComplete('spar_with_soldier')).toBe(true);
        expect(session.pendingBattle()).toBeNull();
        // Losing the match is NOT failing the mission: the next spar
        // is already offered on the board.
        expect(session.missions.newMissions('camp').map((mission) => mission.id)).toContain('spar_with_mage');
    });

    it('each win leaves its flag and the three unlock the captain', () => {
        const session = freshSession();
        session.beginStory();
        pickBranch(session, 0); // Soldier

        for (const match of sparring.slice(0, 3)) {
            winSpar(session, match.missionId, match.fightId);
            expect(session.hasFlag(match.flag)).toBe(true);
            expect(session.missionIsComplete(match.missionId)).toBe(true);
        }

        // The fourth mission: sparring with the captain.
        const offered = session.missions.newMissions('camp').map((mission) => mission.id);
        expect(offered).toContain('spar_with_captain');
    });

    it('the captain\'s reward opens the map and the east field', () => {
        const session = freshSession();
        session.beginStory();
        pickBranch(session, 0); // Soldier
        for (const match of sparring.slice(0, 3)) {
            winSpar(session, match.missionId, match.fightId);
        }

        winSpar(session, 'spar_with_captain', 'sparring_captain');

        expect(session.hasFlag(FLAGS.TRAINING_WON_CAPTAIN)).toBe(true);
        expect(session.missionIsComplete('spar_with_captain')).toBe(true);
        expect(session.hasFlag(FLAGS.TRAINING_COMPLETED)).toBe(true);
        expect(session.hasFlag(FLAGS.MAP_UNLOCKED)).toBe(true);
        expect(session.hasFlag(FLAGS.EAST_FIELD_UNLOCKED)).toBe(true);
        expect(session.travel('east_field').ok).toBe(true);
    });
});

describe('caza menor', () => {
    function trainedSession(): WorldSession {
        const session = freshSession();
        session.beginStory();
        pickBranch(session, 0); // Soldier
        const sparring = [
            { missionId: 'spar_with_soldier', fightId: 'sparring_soldier' },
            { missionId: 'spar_with_mage', fightId: 'sparring_mage' },
            { missionId: 'spar_with_archer', fightId: 'sparring_archer' },
            { missionId: 'spar_with_captain', fightId: 'sparring_captain' },
        ];
        for (const match of sparring) {
            session.startMission(match.missionId);
            session.startMissionBattle(match.missionId);
            session.consumePendingBattle();
            session.finishCombat('won', { fightId: match.fightId, missionId: match.missionId, placeId: 'camp' });
        }
        return session;
    }

    it('requires the captain mission and its arrival starts the first boar pack', () => {
        const session = freshSession();
        expect(session.missions.newMissions('camp').map((mission) => mission.id)).not.toContain('caza_menor');

        const trained = trainedSession();
        expect(trained.startMission('caza_menor')).toBe(true);
        expect(trained.missionIsActive('caza_menor')).toBe(true);

        // The travel step leads to the east field; arriving queues the
        // first pack (the arrival event) with its chat.
        const arrival = trained.travel('east_field');
        expect(arrival.ok).toBe(true);
        expect(arrival.arrival).toBe(true);
        expect(trained.pendingBattle()?.fightId).toBe('boar_trio');
        expect(trained.messages.hasPending()).toBe(true);
    });

    it('chains the packs and opens the squad vote', () => {
        const session = trainedSession();
        session.startMission('caza_menor');
        session.travel('east_field');
        session.consumePendingBattle();
        session.messages.clear();

        session.finishCombat('won', { fightId: 'boar_trio', missionId: 'caza_menor', placeId: 'east_field' });
        expect(session.pendingBattle()?.fightId).toBe('boar_four');
        session.consumePendingBattle();

        session.finishCombat('won', { fightId: 'boar_four', missionId: 'caza_menor', placeId: 'east_field' });
        // The vote: five lines, the last one carrying the two options.
        expect(session.messages.remaining()).toBe(5);
        while (session.messages.peek() && !session.messages.peek()?.choices) {
            session.messages.next();
        }
        const vote = session.messages.peek();
        expect(vote?.choices?.map((choice) => choice.label)).toEqual([
            '⚔️ Fight the spectral boar',
            '🏃 Leave the field',
        ]);
    });

    it('voting to leave completes the mission without a fight', () => {
        const session = trainedSession();
        session.startMission('caza_menor');
        session.travel('east_field');
        session.consumePendingBattle();
        session.finishCombat('won', { fightId: 'boar_trio', missionId: 'caza_menor', placeId: 'east_field' });
        session.consumePendingBattle();
        session.finishCombat('won', { fightId: 'boar_four', missionId: 'caza_menor', placeId: 'east_field' });
        session.messages.clear();

        session.applyStoryEffect({ kind: 'skipBattle', missionId: 'caza_menor' });

        expect(session.missionIsComplete('caza_menor')).toBe(true);
        expect(session.hasFlag(FLAGS.CAZA_COMPLETED)).toBe(true);
        expect(session.pendingBattle()).toBeNull();
    });

    it('voting to fight queues the doomed battle; fleeing it wins and leaves the corpses in the east field', () => {
        const session = trainedSession();
        session.startMission('caza_menor');
        session.travel('east_field');
        session.consumePendingBattle();
        session.finishCombat('won', { fightId: 'boar_trio', missionId: 'caza_menor', placeId: 'east_field' });
        session.consumePendingBattle();
        session.finishCombat('won', { fightId: 'boar_four', missionId: 'caza_menor', placeId: 'east_field' });
        session.messages.clear();

        session.applyStoryEffect({
            kind: 'startFight',
            fightId: 'spectral_boar',
            placeId: 'east_field',
            missionId: 'caza_menor',
        });
        expect(session.pendingBattle()?.fightId).toBe('spectral_boar');
        session.consumePendingBattle();

        // A recruit falls to the ghost; the squad flees.
        const fallen = session.roster.character('soldier_0')!;
        fallen.stats.hp = 0;
        fallen.stats.isAlive = 0;
        session.finishCombat('fled', {
            fightId: 'spectral_boar',
            missionId: 'caza_menor',
            placeId: 'east_field',
            participants: [session.team.getCharacter('player')!, fallen],
        });

        expect(session.missionIsComplete('caza_menor')).toBe(true);
        expect(session.hasFlag(FLAGS.CAZA_COMPLETED)).toBe(true);
        // The corpse stays behind in the east field.
        expect(session.corpsesAt('east_field').map((entry) => entry.character.id)).toContain('soldier_0');
    });

    it('losing the spectral boar fails the mission (it is not winnable)', () => {
        const session = trainedSession();
        session.startMission('caza_menor');
        session.travel('east_field');
        session.consumePendingBattle();
        session.finishCombat('won', { fightId: 'boar_trio', missionId: 'caza_menor', placeId: 'east_field' });
        session.consumePendingBattle();
        session.finishCombat('won', { fightId: 'boar_four', missionId: 'caza_menor', placeId: 'east_field' });
        session.messages.clear();
        session.applyStoryEffect({
            kind: 'startFight',
            fightId: 'spectral_boar',
            placeId: 'east_field',
            missionId: 'caza_menor',
        });
        session.consumePendingBattle();

        expect(FIGHTS.spectral_boar.onLose).toBeDefined();
        const result = session.finishCombat('lost', {
            fightId: 'spectral_boar',
            missionId: 'caza_menor',
            placeId: 'east_field',
        });

        expect(result.message).toContain('Mission failed');
        expect(session.missionIsActive('caza_menor')).toBe(false);
        expect(session.missionIsComplete('caza_menor')).toBe(false);
        // The failed hunt returns to the board (re-acceptable).
        expect(session.missions.newMissions('camp').map((mission) => mission.id)).toContain('caza_menor');
    });
});
