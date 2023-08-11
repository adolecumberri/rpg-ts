import { BATTLE_TYPES, DEFALUT_LOG_OBJECT } from '../constants';
import { getRandomInt, uniqueID } from '../helpers';
import { AttackResult, DefenceResult } from '../types';
import { BattleTypes, Combatant, Log, firstLog, lastLog } from '../types/battleTypes';
import Character from './Character';
import Team from './Team';

class Battle {
  logs: Map<
    number,
    {
      battleId: number;
      initialLog: firstLog;
      logs: Log[];
      finalLog: lastLog;

    }
  > = new Map();
  battleType: BattleTypes = BATTLE_TYPES.TURN_BASED;
  private battleId: number = 0;

  afterBattleCharacters(characterA: Character, characterB: Character): void {
    characterA.afterBattle();
    characterB.afterBattle();
  }

  afterBattleTeams(teamA: Team, teamB: Team): void {
    teamA.members.forEach((member) => {
      member.afterBattle();
    });

    teamB.members.forEach((member) => {
      member.afterBattle();
    });
  }

  beforeBattleCharacters(characterA: Character, characterB: Character): void {
    const resultA = characterA.beforeBattle();
    const resultB = characterB.beforeBattle();

    if (resultA?.value) {
      const defence = characterB.defend(resultA);
      characterB.receiveDamage(defence);
    }

    if (resultB?.value) {
      const defence = characterA.defend(resultB);
      characterA.receiveDamage(defence);
    }
  }

  beforeBattleTeams(teamA: Team, teamB: Team): void {
    teamA.members.forEach((member) => {
      const result = member.beforeBattle();
      if (result?.value) {
        const defender = this.randomCharacterFromTeam(teamB);
        const defence = defender.defend(result);
        defender.receiveDamage(defence);
      }
    });

    teamB.members.forEach((member) => {
      const result = member.beforeBattle();
      if (result?.value) {
        const defender = this.randomCharacterFromTeam(teamA);
        const defence = defender.defend(result);
        defender.receiveDamage(defence);
      }
    });
  }

  static deserialize(data: string, characterFactory: (data: string) => Character): Battle {
    const parsedData = JSON.parse(data);

    const battle = new Battle();
    battle.battleType = parsedData.battleType;

    parsedData.logs.forEach((battleData) => {
      battle.logs.set(battleData.battleId, {
        battleId: battleData.battleId,
        initialLog: battleData.initialLog,
        logs: battleData.logs,
        finalLog: battleData.finalLog,
      });
    });

    return battle;
  }

  runBattle<T extends Combatant>(a: T, b: T): number {
    this.battleId = uniqueID();
    this.logs.set(this.battleId, { ...DEFALUT_LOG_OBJECT, battleId: this.battleId });

    if (a instanceof Character && b instanceof Character) {
      this.firstLog('Character');

      if (this.battleType === BATTLE_TYPES.TURN_BASED) {
        this.turnBasedCharacterBattle(a as Character, b as Character);
      } else if (this.battleType === BATTLE_TYPES.INTERVAL_BASED) {
        this.intervalBasedCharacterBattle(a as Character, b as Character);
      }
    } else if (a instanceof Team && b instanceof Team) {
      this.firstLog('Team');

      if (this.battleType === BATTLE_TYPES.TURN_BASED) {
        this.turnBasedTeamBattle(a as Team, b as Team);
      } else if (this.battleType === BATTLE_TYPES.INTERVAL_BASED) {
        this.intervalBasedTeamBattle(a as Team, b as Team);
      }
    }

    return this.battleId;
  }

  private firstLog(battleDimension: 'Character' | 'Team'): void {
    this.logs.get(this.battleId).initialLog = {
      battleId: this.battleId,
      battleType: this.battleType,
      battleDimension,
    };
  }

  private intervalBasedCharacterBattle(a: Character, b: Character): void {
    let aNextAttackTime = a.stats.attackInterval;
    let bNextAttackTime = b.stats.attackInterval;

    this.beforeBattleCharacters(a, b);

    while (this.isAlive(a) && this.isAlive(b)) {
      if (aNextAttackTime < bNextAttackTime) {
        const attack = a.attack();
        const defence = b.defend(attack);
        b.receiveDamage(defence);
        this.logAction(a, b, attack, defence, aNextAttackTime);
        aNextAttackTime += a.stats.attackInterval;
      } else if (bNextAttackTime < aNextAttackTime) {
        const attack = b.attack();
        const defence = a.defend(attack);
        a.receiveDamage(defence);
        this.logAction(b, a, attack, defence, bNextAttackTime);
        bNextAttackTime += b.stats.attackInterval;
      } else {
        const attackA = a.attack();
        const defenceA = b.defend(attackA);
        b.receiveDamage(defenceA);
        this.logAction(a, b, attackA, defenceA, aNextAttackTime);

        const attackB = b.attack();
        const defenceB = a.defend(attackB);
        a.receiveDamage(defenceB);
        this.logAction(b, a, attackB, defenceB, bNextAttackTime);

        aNextAttackTime += a.stats.attackInterval;
        bNextAttackTime += b.stats.attackInterval;
      }
    }

    if (a.isAlive) {
      this.lastLog(a, b);
    } else if (b.isAlive) {
      this.lastLog(b, a);
    } else {
      this.logDraw(a, b);
    }

    this.afterBattleCharacters(a, b);
  }

  private intervalBasedTeamBattle(a: Team, b: Team): void {
    // paso cada personaje a un objeto con su tiempo de ataque y el personaje.
    const teamACharacters = a.members.map((character) => ({
      nextAttackTime: character.stats.attackInterval,
      character,
    }));
    const teamBCharacters = b.members.map((character) => ({
      nextAttackTime: character.stats.attackInterval,
      character,
    }));

    this.beforeBattleTeams(a, b);

    // hago una lista con toda la gente involucrada.
    const allCharacters = [...teamACharacters, ...teamBCharacters];

    let interval = 0;
    while (a.isTeamAlive() && b.isTeamAlive()) {
      interval++;
      allCharacters.forEach((attackerInfo) => {
        if (attackerInfo.nextAttackTime === interval) {
          const attacker = attackerInfo.character;
          const defenderTeam = a.hasMember(attacker) ? b : a;
          const defender = this.randomCharacterFromTeam(defenderTeam);

          const attack = attacker.attack();
          const defence = defender.defend(attack);
          defender.receiveDamage(defence);
          this.logAction(attacker, defender, attack, defence, attackerInfo.nextAttackTime);
          attackerInfo.nextAttackTime += attacker.stats.attackInterval;
        }
      });
    }

    if (a.isTeamAlive()) {
      this.lastLog(a, b);
    } else if (b.isTeamAlive()) {
      this.lastLog(b, a);
    } else {
      this.logDraw(a, b);
    }

    this.afterBattleTeams(a, b);
  }

  private isAlive(combatant: Combatant): boolean {
    if (combatant instanceof Character) {
      return (combatant as Character).isAlive;
    } else {
      return (combatant as Team).isTeamAlive();
    }
  }

  private lastLog(winner: Combatant, looser: Combatant): void {
    if (winner instanceof Character) {
      this.logs.get(this.battleId).finalLog = {
        winnerId: winner.id,
        winnerName: (winner as Character).name,
        winnerHp: (winner as Character).stats.hp,
        looserId: looser.id,
        looserName: (looser as Character).name,
        looserHp: (looser as Character).stats.hp,

      };
    } else {
      this.logs.get(this.battleId).finalLog = {
        winner: winner.id,
        winnerAliveCharacters: (winner as Team).getAliveMembers().length,
        winnerDeadCharacters: (winner as Team).getDeadMembers().length,
        looser: looser.id,
        looserAliveCharacters: (looser as Team).getAliveMembers().length,
        looserDeadCharacters: (looser as Team).getDeadMembers().length,
      };
    }
  }

  private logAction(
    attacker: Character,
    defender: Character,
    attackObject: AttackResult,
    defenceObject: DefenceResult,
    round: number,
  ): void {
    this.logs.get(this.battleId).logs.push({
      intervalOrTurn: round,
      idAttackRecord: attackObject.recordId || null, // if character has ActionRecord
      idDefenceRecord: defenceObject.recordId || null, // if character has ActionRecord
      attackerId: attacker.id, // These would be dynamic in the final version
      defenderId: defender.id, // These would be dynamic in the final version
      attackerHp: attacker.stats.hp, // These would be dynamic in the final version
      defenderHp: defender.stats.hp, // These would be dynamic in the final version
    });
  }

  private logDraw(combatantA: Combatant, combatantB: Combatant): void {
    if (combatantA instanceof Character) {
      this.logs.get(this.battleId).finalLog = {
        draw: true,
        characterAId: combatantA.id,
        characterAName: (combatantA as Character).name,
        characterAHp: (combatantA as Character).stats.hp,
        characterBId: combatantB.id,
        characterBName: (combatantB as Character).name,
        characterBHp: (combatantB as Character).stats.hp,
      };
    } else {
      this.logs.get(this.battleId).finalLog = {
        draw: true,
        teamAId: combatantA.id,
        teamAAliveCharacters: (combatantA as Team).getAliveMembers().length,
        teamADeadCharacters: (combatantA as Team).getDeadMembers().length,
        teamBId: combatantB.id,
        teamBAliveCharacters: (combatantB as Team).getAliveMembers().length,
        teamBDeadCharacters: (combatantB as Team).getDeadMembers().length,
      };
    }
  }

  private randomCharacterFromTeam(team: Team): Character | null {
    if (!team.isTeamAlive()) return null;

    const aliveMembers = team.getAliveMembers();
    const randomIndex = getRandomInt(0, aliveMembers.length - 1);
    return aliveMembers[randomIndex];
  }

  setBattleType(type: BattleTypes): void {
    this.battleType = type;
  }

  private turnBasedCharacterBattle(a: Character, b: Character): void {
    let turn = 0;

    // beforeBattle:
    this.beforeBattleCharacters(a, b);
    while (this.isAlive(a) && this.isAlive(b)) {
      turn++;
      let firstAttacker: Character;
      let secondAttacker: Character;

      // Determine the order of attack based on attackSpeed
      if (a.stats.attackSpeed >= b.stats.attackSpeed) {
        firstAttacker = a;
        secondAttacker = b;
      } else if (a.stats.attackSpeed < b.stats.attackSpeed) {
        firstAttacker = b;
        secondAttacker = a;
      } else {
        // If both characters have the same attackSpeed, a random number determines who attacks first
        if (Math.random() < 0.5) {
          firstAttacker = a;
          secondAttacker = b;
        } else {
          firstAttacker = b;
          secondAttacker = a;
        }
      }

      // First character attacks
      const firstAttack = firstAttacker.attack();
      const firstDefence = secondAttacker.defend(firstAttack);

      secondAttacker.receiveDamage(firstDefence);
      this.logAction(firstAttacker, secondAttacker, firstAttack, firstDefence, turn);

      // Check if the second character is still alive before they attack
      if (this.isAlive(secondAttacker)) {
        const secondAttack = secondAttacker.attack();
        const secondDefence = firstAttacker.defend(secondAttack);

        firstAttacker.receiveDamage(secondDefence);
        this.logAction(secondAttacker, firstAttacker, secondAttack, secondDefence, turn);
      }
    }

    if (a.isAlive) {
      this.lastLog(a, b);
    } else if (b.isAlive) {
      this.lastLog(b, a);
    } else {
      // draw
      this.logDraw(a, b);
    }
    this.afterBattleCharacters(a, b);
  }

  private turnBasedTeamBattle(a: Team, b: Team): void {
    let turn = 0;

    this.beforeBattleTeams(a, b);
    while (a.isTeamAlive() && b.isTeamAlive()) {
      turn++;

      // Create a combined list of all characters from both teams
      const allCharacters = [...a.getAliveMembers(), ...b.getAliveMembers()];

      // Sort characters by attackSpeed
      allCharacters.sort((char1, char2) => char2.stats.attackSpeed - char1.stats.attackSpeed);


      for (const attacker of allCharacters) {
        // Determine the defending team and pick a random defender
        const defenderTeam = a.hasMember(attacker) ? b : a;

        if (!defenderTeam.isTeamAlive()) break; // maybe a bad praxis.

        const defender = this.randomCharacterFromTeam(defenderTeam);

        if (defender === null) console.log('alive?', defenderTeam.isTeamAlive());

        const attack = attacker.attack();
        const defence = defender.defend(attack);
        defender.receiveDamage(defence);
        this.logAction(attacker, defender, attack, defence, turn);
      }
    }

    if (a.isTeamAlive()) {
      this.lastLog(a, b);
    } else if (b.isTeamAlive()) {
      this.lastLog(b, a);
    } else {
      this.logDraw(a, b);
    }

    this.afterBattleTeams(a, b);
  }

  serialize(): string {
    const serialized = {
      battleType: this.battleType,
      logs: Array.from(this.logs.entries()).map(([battleId, battleData]) => {
        return {
          battleId,
          initialLog: battleData.initialLog,
          logs: battleData.logs,
          finalLog: battleData.finalLog,
        };
      }),
    };

    return JSON.stringify(serialized);
  }
}

export default Battle;

export {
  Battle,
};
