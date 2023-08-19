import { Character, Team } from '../classes';
import { BATTLE_TYPES } from '../constants';

type BattleTypes = keyof typeof BATTLE_TYPES;

interface Log {
    intervalOfTurn: number;
    idAttackRecord: number | null;
    idDefenceRecord: number | null;
    attackerId: number;
    defenderId: number;
    attackerHp: number;
    defenderHp: number;
}

interface firstLog {
    battleId: number,
    battleType: keyof typeof BATTLE_TYPES,
    battleDimension: 'Character' | 'Team',
}

interface characterBattleLastLog {
    draw: boolean,
    winnerId: number | null,
    looserId: number | null,
    characterAId: number,
    characterAHp: number,
    characterBId: number,
    characterBHp: number,
}

interface teamBattleLastLog {
    draw: boolean,
    winnerId: number | null,
    looserId: number | null,
    teamAId: number,
    teamADeadMembers: number,
    teamAAliveMembers: number,
    teamATotalMembers: number,
    teamBId: number,
    teamBDeadMembers: number,
    teamBAliveMembers: number,
    teamBTotalMembers: number,
}

type Combatant = Character | Team;

export {
  BattleTypes,
  Log,
  firstLog,
  characterBattleLastLog,
  teamBattleLastLog,
  Combatant,
};
