import { Character, IntervalCombat, Stats } from '../../../src';
import type { IntervalCombatant, IntervalCombatOptions, IntervalCombatResult } from '../../../src';
import { grantCombatXp } from '../xp/xpSystem';
import type { WorldSession } from '../session';
import { generalAttackResolver } from '../damage/general';
import { intervalFromSpeed } from './speed';

export type { IntervalCombatant, IntervalCombatOptions, IntervalCombatResult } from '../../../src';

// A combatant plus its battle presentation: the emoji stands in for
// the portrait art until real images exist, then `image` gets a path.
export interface IntervalBattleEntry extends IntervalCombatant {
    icon: string;
    image: string;
}

// Fixed values for the interval-based demo battle. Fighters carry a
// SPEED and their attack interval is derived from it (intervalFromSpeed),
// so there is a single stat driving how often everyone acts.
export const INTERVAL_BATTLE = {
    allies: [
        { id: 'hero', speed: 8, icon: '🦸', image: '' },
        { id: 'companion', speed: 6, icon: '🏹', image: '' },
        { id: 'ember', speed: 5, icon: '🐉', image: '' },
    ],
    enemies: [
        { id: 'goblin', name: 'Goblin', speed: 6, hp: 30, totalHp: 30, attack: 6, defence: 0, magicDefence: 0, icon: '👺', image: '' },
        { id: 'troll', name: 'Troll', speed: 4, hp: 50, totalHp: 50, attack: 9, defence: 1, magicDefence: 2, icon: '👹', image: '' },
    ],
} as const;

/**
 * Builds the interval battle combatants. The allies are cloned from
 * the real party so the simulation never mutates the session state.
 */
export function buildIntervalCombatants(
    session: WorldSession,
): { left: IntervalBattleEntry[]; right: IntervalBattleEntry[] } {
    const left: IntervalBattleEntry[] = [];
    for (const entry of INTERVAL_BATTLE.allies) {
        const real = session.team.getCharacter(entry.id);
        if (!real) continue;
        const clone = new Character({
            id: real.id,
            name: real.name,
            stats: new Stats({
                attack: real.getStat('attack'),
                defence: real.getStat('defence'),
                magicDefence: real.getStat('magicDefence'),
                critChance: real.getStat('critChance'),
                critMultiplier: real.getStat('critMultiplier'),
                speed: real.getStat('speed'),
                hp: real.getStat('hp'),
                totalHp: real.getStat('totalHp'),
            }),
        });
        left.push({ character: clone, interval: intervalFromSpeed(entry.speed), icon: entry.icon, image: entry.image });
    }

    const right: IntervalBattleEntry[] = INTERVAL_BATTLE.enemies.map((entry) => ({
        character: new Character({
            id: entry.id,
            name: entry.name,
            stats: new Stats({
                attack: entry.attack,
                defence: entry.defence,
                magicDefence: entry.magicDefence,
                speed: entry.speed,
                hp: entry.hp,
                totalHp: entry.totalHp,
            }),
        }),
        interval: intervalFromSpeed(entry.speed),
        icon: entry.icon,
        image: entry.image,
    }));

    return { left, right };
}

export function resolveIntervalDemo(
    session: WorldSession,
    options: IntervalCombatOptions = {},
): IntervalCombatResult {
    const { left, right } = buildIntervalCombatants(session);
    return new IntervalCombat().resolve(left, right, { ...options, damageResolver: generalAttackResolver });
}

/**
 * Grants the individual XP for a kill in the interval battle: the
 * killer gets the kill XP (or 1 when 5+ levels above the creature)
 * and every other alive ally gets the assist XP.
 */
export function grantIntervalKillXp(session: WorldSession, killerId: string): { message: string } {
    const killer = session.team.getCharacter(killerId);
    if (!killer) return { message: '' };

    const grants = grantCombatXp({ killer, allies: session.team.getAlive(), creatureLevel: 1 });
    const leveled = grants.some((grant) => grant.levels > 0);
    const summary = grants.map((grant) => `${grant.character.name} +${grant.gained}`).join(' · ');
    return { message: `⚔️ ${summary}${leveled ? ' — leveled up!' : ''}` };
}
