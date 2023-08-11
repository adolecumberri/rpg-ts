import { Character, Team } from '../classes';
import { BATTLE_TYPES } from '../constants';

type BattleTypes = keyof typeof BATTLE_TYPES;


interface Log {
    intervalOrTurn: number;
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

interface charactersBattleLastLog {
    winnerId: number,
    winnerName: string,
    winnerHp: number,
    looserId: number,
    looserName: string,
    looserHp: number,
}

interface charactersBattleDrawLastLog {
    draw: boolean,
    characterAId: number,
    characterAName: string,
    characterAHp: number,
    characterBId: number,
    characterBName: string,
    characterBHp: number,
}

interface teamsBattleLastLog {
    winner: number,
    winnerAliveCharacters: number,
    winnerDeadCharacters: number,
    looser: number,
    looserAliveCharacters: number,
    looserDeadCharacters: number,
}

interface teamsBattleDrawLastLog {
    draw: boolean,
    teamAId: number,
    teamAAliveCharacters: number,
    teamADeadCharacters: number,
    teamBId: number,
    teamBAliveCharacters: number,
    teamBDeadCharacters: number,
}

type lastLog = charactersBattleLastLog | charactersBattleDrawLastLog | teamsBattleLastLog | teamsBattleDrawLastLog

type Combatant = Character | Team;

export {
  BattleTypes,
  Log,
  firstLog,
  lastLog,
  Combatant,
};
