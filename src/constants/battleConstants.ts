
const BATTLE_TYPES = {
  TURN_BASED: 'TURN_BASED',
  INTERVAL_BASED: 'INTERVAL_BASED',
} as const;

const DEFALUT_LOG_OBJECT = {
  battleId: 0,
  initialLog: {
    battleId: 0,
    battleType: BATTLE_TYPES.TURN_BASED,
    battleDimension: 'Character' as const,
  },
  logs: [],
  finalLog: {
    winner: 0,
    winnerAliveCharacters: 0,
    winnerDeadCharacters: 0,
    looser: 0,
    looserAliveCharacters: 0,
    looserDeadCharacters: 0,
  },
};

export {
  BATTLE_TYPES,
  DEFALUT_LOG_OBJECT,
};
