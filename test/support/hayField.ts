import type { WorldSession } from '../../worldTest/core/session';
import { FIGHTS } from '../../worldTest/core/config/fights';
import { buildHybridCombat } from '../../worldTest/core/combat/hybridCombat';
import type { HybridCombat, HybridEvent } from '../../worldTest/core/combat/hybridCombat';

// Shared battle drivers for the hay field story chain. Tests use them
// to win the three story battles deterministically (random 0.5: no
// crits, no misses even with the fatigue accuracy penalty, and auto
// fighters always target the middle of the enemy team).

export function driveHybridToEnd(combat: HybridCombat, preferSkills = false): HybridEvent[] {
    const events: HybridEvent[] = [];
    for (let guard = 0; guard < 4000; guard++) {
        const event = combat.next();
        events.push(event);
        if (event.kind === 'end') return events;
        if (event.kind === 'manual') {
            const skillIds = event.skills ?? [];
            // The boss fight awakens the Gate affinity first, then
            // breathes fire; any other skill battle takes skills[0].
            const preferred = preferSkills && skillIds.length > 0
                ? (skillIds.indexOf('fire_breath') !== -1
                    ? 'fire_breath'
                    : skillIds.indexOf('open_gate') !== -1
                        ? 'open_gate'
                        : skillIds[0])
                : undefined;
            const resolved = preferred
                ? combat.resolveManualSkill(preferred)
                : combat.resolveManual(event.targets[0]);
            if (resolved) events.push(resolved);
        }
    }
    throw new Error('battle did not end within the guard');
}

/** Runs one hay battle to the end and settles it as a victory. */
export function winHayFight(
    session: WorldSession,
    fightId: string,
    preferSkills = false,
): ReturnType<WorldSession['finishCombat']> {
    const setup = buildHybridCombat(session, FIGHTS[fightId], { random: () => 0.5 });
    const events = driveHybridToEnd(setup.combat, preferSkills);

    const kills: { enemyId: string; killerId: string }[] = [];
    for (const event of events) {
        if (event.kind !== 'auto') continue;
        if (event.kills && event.kills.length > 0) {
            for (const kill of event.kills) {
                kills.push({ enemyId: kill.targetId, killerId: kill.killerId });
            }
        } else if (!event.targetAlive) {
            kills.push({ enemyId: event.targetId, killerId: event.actorId });
        }
    }

    const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
    return session.finishCombat('won', {
        placeId: 'hay_field',
        fightId,
        missionId: 'sickles_to_hay',
        kills,
        fighters,
        participants: setup.allies,
    });
}

/**
 * Wins the whole hay field chain: the arrival skirmish, the united
 * farmers battle and the goblin chief (fought as the lord's son with
 * his fire breath). Completes the sickles mission. Story lines are
 * consumed the way the message box would read them before each battle.
 */
export function winHayFieldBattles(session: WorldSession): void {
    session.consumePendingBattle(); // arrival battle (no-op if consumed)
    session.messages.clear(); // the thanks lines were read
    winHayFight(session, 'hay_goblins');
    session.consumePendingBattle();
    session.messages.clear(); // the rally lines were read
    winHayFight(session, 'hay_goblins_2');
    session.consumePendingBattle();
    session.messages.clear(); // the boss call line was read
    winHayFight(session, 'hay_boss', true);
}
