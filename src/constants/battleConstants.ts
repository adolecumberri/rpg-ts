import { Log, characterBattleLastLog, firstLog, teamBattleLastLog } from '../types';

const BATTLE_TYPES = {
  TURN_BASED: 'TURN_BASED',
  INTERVAL_BASED: 'INTERVAL_BASED',
} as const;

const DEFALUT_LOG_OBJECT: {
  battleId: number,
  initialLog: firstLog,
  logs: Log[],
  finalLog: characterBattleLastLog | teamBattleLastLog,
} = {
  battleId: 0,
  initialLog: {
    battleId: 0,
    battleType: BATTLE_TYPES.TURN_BASED,
    battleDimension: 'Character' as const,
  },
  logs: [],
  finalLog: {
    draw: true,
    winnerId: null,
    looserId: null,
    characterAId: 0,
    characterBId: 0,
  },
};

export {
  BATTLE_TYPES,
  DEFALUT_LOG_OBJECT,
};
