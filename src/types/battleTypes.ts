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
    fightId: number,
    battleType: keyof typeof BATTLE_TYPES,
    battleDimension: 'Character' | 'Team',
}

interface charactersFightLastLog {
    winnerId: number,
    winnerName: string,
    winnerHp: number,
    looserId: number,
    looserName: string,
    looserHp: number,
}

interface charactersFightDrawLastLog {
    draw: boolean,
    characterAId: number,
    characterAName: string,
    characterAHp: number,
    characterBId: number,
    characterBName: string,
    characterBHp: number,
}

interface teamsFightLastLog {
    winner: number,
    winnerAliveCharacters: number,
    winnerDeadCharacters: number,
    looser: number,
    looserAliveCharacters: number,
    looserDeadCharacters: number,
}

interface teamsFightDrawLastLog {
    draw: boolean,
    teamAId: number,
    teamAAliveCharacters: number,
    teamADeadCharacters: number,
    teamBId: number,
    teamBAliveCharacters: number,
    teamBDeadCharacters: number,
}

type lastLog = charactersFightLastLog | charactersFightDrawLastLog | teamsFightLastLog | teamsFightDrawLastLog

type Combatant = Character | Team;

export {
  BattleTypes,
  Log,
  firstLog,
  lastLog,
  Combatant,
};
