
import { Battle, Character, Team } from '../../src/classes';
import { BATTLE_TYPES } from '../../src/constants';

describe('Battle class tests', () => {
  let battle: Battle;
  let character1: Character;
  let character2: Character;
  let character3: Character;
  let character4: Character;
  let team1: Team;
  let team2: Team;

  beforeEach(() => {
    battle = new Battle();
    character1 = new Character({
      id: 1,
      name: 'Char1',
      stats: { hp: 10, attack: 2, defense: 1, attackSpeed: 1, attackInterval: 2 },
    });
    character2 = new Character({
      id: 2,
      name: 'Char2',
      stats: { hp: 10, attack: 3, defense: 2, attackSpeed: 1, attackInterval: 3 },
    });

    character3 = new Character({
      id: 3,
      name: 'Char3',
      stats: { hp: 10, attack: 2, defense: 1, attackSpeed: 1, attackInterval: 1 },
    });
    character4 = new Character({
      id: 4,
      name: 'Char4',
      stats: { hp: 10, attack: 4, defense: 2, attackSpeed: 1, attackInterval: 3 },
    });

    team1 = new Team({
      members: [
        character1,
        character2,
      ],
    });
    team2 = new Team({
      members: [
        character3,
        character4,
      ],
    });
  });

  describe('Turn based Character fight', () => {
    test('should handle character turn-based fights', () => {
      battle.setBattleType(BATTLE_TYPES.TURN_BASED);
      battle.fight(character1, character2);

      // Asegúrate de que la batalla ha tenido lugar y los personajes han intercambiado daño
      expect(character1.stats.hp).toBeLessThan(character1.stats.totalHp);
      expect(character2.stats.hp).toBeLessThan(character2.stats.totalHp);
    });

    test('At least one Character should be dead after a turn based battle', () => {
      battle.setBattleType(BATTLE_TYPES.TURN_BASED);
      battle.fight(character1, character2);

      const atLeastOneDead = !character1.isAlive || !character2.isAlive;
      expect(atLeastOneDead).toBe(true);
    });
  });

  describe('Interval based Character fight', () => {
    test('should handle team interval-based fights', () => {
      battle.setBattleType(BATTLE_TYPES.INTERVAL_BASED);
      battle.fight(team1, team2);

      // Asegúrate de que la batalla ha tenido lugar y los equipos han intercambiado daño
      expect(team1.getAliveMembers().length).toBeLessThan(team1.members.length);
      expect(team2.getAliveMembers().length).toBeLessThan(team2.members.length);
    });

    test('At least one Character should be dead after an interval based battle', () => {
      battle.setBattleType(BATTLE_TYPES.INTERVAL_BASED);
      battle.fight(character1, character2);

      const atLeastOneDead = !character1.isAlive || !character2.isAlive;
      expect(atLeastOneDead).toBe(true);
    });
  });

  describe('Turn based Team fight', () => {
    test('All Characters in a team should have decreased health after a turn based battle', () => {
      battle.setBattleType(BATTLE_TYPES.TURN_BASED);
      battle.fight(team1, team2);

      const team1Members = team1.members;
      const team2Members = team2.members;

      team1Members.concat(team2Members).forEach((character) => {
        expect(character.stats.hp).toBeLessThan(character.stats.totalHp);
      });
    });

    test('At least one team should be dead after a turn based battle', () => {
      battle.setBattleType(BATTLE_TYPES.TURN_BASED);
      battle.fight(team1, team2);

      const atLeastOneTeamDead = !team1.isTeamAlive() || !team2.isTeamAlive();
      expect(atLeastOneTeamDead).toBe(true);
    });
  });

  describe('tests tal vez repetidos', () => {
    test('fight between Characters', () => {
      const battle = new Battle();
      const char1 = new Character({
        id: 1,
        name: 'Char1',
        stats: { hp: 10, attack: 2, defense: 1, speed: 1, attackSpeed: 1, attackInterval: 1 },
      });
      const char2 = new Character({
        id: 2,
        name: 'Char2',
        stats: { hp: 10, attack: 3, defense: 2, speed: 1, attackSpeed: 1, attackInterval: 1 },
      });

      battle.fight(char1, char2);

      expect(battle.logs.get(1)).toBeDefined();
      expect(battle.logs.get(1)?.initialLog.fightId).toBe(1);
      expect(battle.logs.get(1)?.initialLog.battleDimension).toBe('Character');
      expect(battle.logs.get(1)?.initialLog.battleType).toBe(BATTLE_TYPES.TURN_BASED);
      expect(battle.logs.get(1)?.logs.length).toBeGreaterThan(0);
      expect(battle.logs.get(1)?.finalLog).toBeDefined();
    });

    test('fight between Teams', () => {
      const battle = new Battle();
      const team1 = new Team({
        members: [
          new Character({
            id: 1,
            name: 'Char1',
            stats: { hp: 10, attack: 2, defense: 1, speed: 1, attackSpeed: 1, attackInterval: 1 },
          }),
          new Character({
            id: 2,
            name: 'Char2',
            stats: { hp: 10, attack: 3, defense: 2, speed: 1, attackSpeed: 1, attackInterval: 1 },
          }),
        ],
      });

      const team2 = new Team({
        members: [
          new Character({
            id: 3,
            name: 'Char3',
            stats: { hp: 10, attack: 2, defense: 1, speed: 1, attackSpeed: 1, attackInterval: 1 },
          }),
          new Character({
            id: 4,
            name: 'Char4',
            stats: { hp: 10, attack: 3, defense: 2, speed: 1, attackSpeed: 1, attackInterval: 1 },
          }),
        ],
      });

      battle.fight(team1, team2);

      expect(battle.logs.get(1)).toBeDefined();
      expect(battle.logs.get(1)?.initialLog.fightId).toBe(1);
      expect(battle.logs.get(1)?.initialLog.battleDimension).toBe('Team');
      expect(battle.logs.get(1)?.initialLog.battleType).toBe(BATTLE_TYPES.TURN_BASED);
      expect(battle.logs.get(1)?.logs.length).toBeGreaterThan(0);
      expect(battle.logs.get(1)?.finalLog).toBeDefined();
    });
  });
});
