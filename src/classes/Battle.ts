import { BATTLE_TYPES, DEFALUT_LOG_OBJECT } from '../constants';
import { getRandomInt, uniqueID } from '../helpers';
import { AttackResult, DefenceResult } from '../types';
import { BattleTypes, Combatant, Log, firstLog, characterBattleLastLog, teamBattleLastLog } from '../types/battleTypes';
import Character from './Character';
import Team from './Team';

class Battle {
  logs: Map<
    number,
    {
      battleId: number;
      initialLog: firstLog;
      logs: Log[];
      finalLog: characterBattleLastLog | teamBattleLastLog;
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

  private characterLastLog( log: characterBattleLastLog): void {
    this.logs.get(this.battleId).finalLog = log;
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

  private executeAttack(attacker: Character, defender: Character, round: number): void {
    const attack = attacker.attack();
    const defence = defender.defend(attack);
    defender.receiveDamage(defence);
    this.logAction(attacker, defender, attack, defence, round);

    attacker.actionRecord?.attacks.forEach((attackRecord) => {
      if (attackRecord.id === attack.recordId) {
        attackRecord.damageDealt = defence.value;
      }
    });
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
        this.executeAttack(a, b, aNextAttackTime);
        aNextAttackTime += a.stats.attackInterval;
      } else if (bNextAttackTime < aNextAttackTime) {
        this.executeAttack(b, a, bNextAttackTime);
        bNextAttackTime += b.stats.attackInterval;
      } else {
        this.executeAttack(a, b, aNextAttackTime);
        this.executeAttack(b, a, bNextAttackTime);

        aNextAttackTime += a.stats.attackInterval;
        bNextAttackTime += b.stats.attackInterval;
      }
    }

    if (a.isAlive) {
      this.characterLastLog({
        draw: false,
        winnerId: a.id,
        looserId: b.id,
        characterAId: a.id,
        characterAHp: a.stats.hp,
        characterBId: b.id,
        characterBHp: b.stats.hp,
      });
    } else if (b.isAlive) {
      this.characterLastLog({
        draw: false,
        winnerId: b.id,
        looserId: a.id,
        characterAId: a.id,
        characterAHp: a.stats.hp,
        characterBId: b.id,
        characterBHp: b.stats.hp,
      });
    } else {
      this.characterLastLog({
        draw: true,
        winnerId: null,
        looserId: null,
        characterAId: a.id,
        characterAHp: a.stats.hp,
        characterBId: b.id,
        characterBHp: b.stats.hp,
      });
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

          this.executeAttack(attacker, defender, attackerInfo.nextAttackTime);
          attackerInfo.nextAttackTime += attacker.stats.attackInterval;
        }
      });
    }

    if (a.isTeamAlive()) {
      this.teamLastLog({
        draw: false,
        winnerId: a.id,
        looserId: b.id,
        teamAId: a.id,
        teamADeadMembers: a.getDeadMembers().length,
        teamAAliveMembers: a.getAliveMembers().length,
        teamATotalMembers: a.members.length,
        teamBId: b.id,
        teamBDeadMembers: b.getDeadMembers().length,
        teamBAliveMembers: b.getAliveMembers().length,
        teamBTotalMembers: b.members.length,
      });
    } else if (b.isTeamAlive()) {
      this.teamLastLog({
        draw: false,
        winnerId: b.id,
        looserId: a.id,
        teamAId: a.id,
        teamADeadMembers: a.getDeadMembers().length,
        teamAAliveMembers: a.getAliveMembers().length,
        teamATotalMembers: a.members.length,
        teamBId: b.id,
        teamBDeadMembers: b.getDeadMembers().length,
        teamBAliveMembers: b.getAliveMembers().length,
        teamBTotalMembers: b.members.length,
      });
    } else {
      this.teamLastLog({
        draw: true,
        winnerId: null,
        looserId: null,
        teamAId: a.id,
        teamADeadMembers: a.getDeadMembers().length,
        teamAAliveMembers: a.getAliveMembers().length,
        teamATotalMembers: a.members.length,
        teamBId: b.id,
        teamBDeadMembers: b.getDeadMembers().length,
        teamBAliveMembers: b.getAliveMembers().length,
        teamBTotalMembers: b.members.length,
      });
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

  private teamLastLog(log: teamBattleLastLog): void {
      this.logs.get(this.battleId).finalLog = log;
  }

  private logAction(
    attacker: Character,
    defender: Character,
    attackObject: AttackResult,
    defenceObject: DefenceResult,
    round: number,
  ): void {
    this.logs.get(this.battleId).logs.push({
      intervalOfTurn: round,
      idAttackRecord: attackObject.recordId || null, // if character has ActionRecord
      idDefenceRecord: defenceObject.recordId || null, // if character has ActionRecord
      attackerId: attacker.id, // These would be dynamic in the final version
      defenderId: defender.id, // These would be dynamic in the final version
      attackerHp: attacker.stats.hp, // These would be dynamic in the final version
      defenderHp: defender.stats.hp, // These would be dynamic in the final version
    });
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
      this.executeAttack(firstAttacker, secondAttacker, turn);

      // Check if the second character is still alive before they attack
      if (this.isAlive(secondAttacker)) {
        this.executeAttack(secondAttacker, firstAttacker, turn);
      }
    }

    if (a.isAlive) {
      this.characterLastLog({
        draw: false,
        winnerId: a.id,
        looserId: b.id,
        characterAId: a.id,
        characterAHp: a.stats.hp,
        characterBId: b.id,
        characterBHp: b.stats.hp,
      });
    } else if (b.isAlive) {
      this.characterLastLog({
        draw: false,
        winnerId: b.id,
        looserId: a.id,
        characterAId: a.id,
        characterAHp: a.stats.hp,
        characterBId: b.id,
        characterBHp: b.stats.hp,
      });
    } else {
      this.characterLastLog({
        draw: true,
        winnerId: null,
        looserId: null,
        characterAId: a.id,
        characterAHp: a.stats.hp,
        characterBId: b.id,
        characterBHp: b.stats.hp,
      });
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
      this.teamLastLog({
        draw: false,
        winnerId: a.id,
        looserId: b.id,
        teamAId: a.id,
        teamADeadMembers: a.getDeadMembers().length,
        teamAAliveMembers: a.getAliveMembers().length,
        teamATotalMembers: a.members.length,
        teamBId: b.id,
        teamBDeadMembers: b.getDeadMembers().length,
        teamBAliveMembers: b.getAliveMembers().length,
        teamBTotalMembers: b.members.length,
      });
    } else if (b.isTeamAlive()) {
      this.teamLastLog({
        draw: false,
        winnerId: b.id,
        looserId: a.id,
        teamAId: a.id,
        teamADeadMembers: a.getDeadMembers().length,
        teamAAliveMembers: a.getAliveMembers().length,
        teamATotalMembers: a.members.length,
        teamBId: b.id,
        teamBDeadMembers: b.getDeadMembers().length,
        teamBAliveMembers: b.getAliveMembers().length,
        teamBTotalMembers: b.members.length,
      });
    } else {
      this.teamLastLog({
        draw: true,
        winnerId: null,
        looserId: null,
        teamAId: a.id,
        teamADeadMembers: a.getDeadMembers().length,
        teamAAliveMembers: a.getAliveMembers().length,
        teamATotalMembers: a.members.length,
        teamBId: b.id,
        teamBDeadMembers: b.getDeadMembers().length,
        teamBAliveMembers: b.getAliveMembers().length,
        teamBTotalMembers: b.members.length,
      });
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
