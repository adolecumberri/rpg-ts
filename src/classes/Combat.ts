import { Character } from "./Character";
import { Team } from "./Team";

type CombatSide = Character | Team;
type CombatWinner = "left" | "right" | "draw";

export type CombatOptions = {
    maxRounds?: number;
    randomTarget?: boolean;
    stopOnStalemate?: boolean;
};

export type CombatTurn = {
    round: number;
    attackerId: string;
    defenderId: string;
    attackType: string;
    rawDamage: number;
    damageApplied: number;
    defenderHpAfter: number;
    defenderAlive: boolean;
};

export type CombatResult = {
    winner: CombatWinner;
    rounds: number;
    turns: CombatTurn[];
    leftSurvivors: string[];
    rightSurvivors: string[];
};

const DEFAULT_COMBAT_OPTIONS: Required<CombatOptions> = {
    maxRounds: 999,
    randomTarget: true,
    stopOnStalemate: true,
};

export class Combat {
    private options: Required<CombatOptions>;

    constructor(options: CombatOptions = {}) {
        this.options = {
            ...DEFAULT_COMBAT_OPTIONS,
            ...options,
        };
    }

    autoBetweenCharacters(left: Character, right: Character, options: CombatOptions = {}): CombatResult {
        return this.auto(left, right, options);
    }

    autoBetweenTeams(left: Team, right: Team, options: CombatOptions = {}): CombatResult {
        return this.auto(left, right, options);
    }

    auto(left: CombatSide, right: CombatSide, options: CombatOptions = {}): CombatResult {
        const config = { ...this.options, ...options };
        const turns: CombatTurn[] = [];

        if (this.getAlive(left).length === 0 || this.getAlive(right).length === 0) {
            throw new Error("Both sides must have at least one alive character before combat starts.");
        }

        let rounds = 0;
        while (rounds < config.maxRounds
            && this.getAlive(left).length > 0
            && this.getAlive(right).length > 0
        ) {
            rounds++;
            let damageThisRound = 0;

            const leftAttackers = [...this.getAlive(left)];
            for (const attacker of leftAttackers) {
                const defenders = this.getAlive(right);
                if (defenders.length === 0) break;

                const defender = this.pickTarget(defenders, config.randomTarget);
                const turn = this.resolveAttack(attacker, defender, rounds);
                damageThisRound += turn.damageApplied;
                turns.push(turn);
            }

            if (this.getAlive(right).length === 0) break;

            const rightAttackers = [...this.getAlive(right)];
            for (const attacker of rightAttackers) {
                const defenders = this.getAlive(left);
                if (defenders.length === 0) break;

                const defender = this.pickTarget(defenders, config.randomTarget);
                const turn = this.resolveAttack(attacker, defender, rounds);
                damageThisRound += turn.damageApplied;
                turns.push(turn);
            }

            if (config.stopOnStalemate && damageThisRound === 0) {
                break;
            }
        }

        const leftSurvivors = this.getAlive(left).map((char) => char.id);
        const rightSurvivors = this.getAlive(right).map((char) => char.id);

        let winner: CombatWinner = "draw";
        if (leftSurvivors.length > 0 && rightSurvivors.length === 0) winner = "left";
        if (rightSurvivors.length > 0 && leftSurvivors.length === 0) winner = "right";

        return {
            winner,
            rounds,
            turns,
            leftSurvivors,
            rightSurvivors,
        };
    }

    private resolveAttack(attacker: Character, defender: Character, round: number): CombatTurn {
        const attack = attacker.combat.attack(attacker);

        const defence = defender.combat.defence(defender, attack);

        defender.stats.hp = Math.max(0, defender.stats.hp - defence.value);
        defender.stats.isAlive = defender.stats.hp > 0 ? 1 : 0;

        return {
            round,
            attackerId: attacker.id,
            defenderId: defender.id,
            attackType: attack.type,
            rawDamage: attack.value,
            damageApplied: defence.value,
            defenderHpAfter: defender.stats.hp,
            defenderAlive: defender.stats.isAlive > 0,
        };
    }

    private getAlive(side: CombatSide): Character[] {
        const list = this.toCharacters(side);
        return list.filter((char) => this.isAlive(char));
    }

    private toCharacters(side: CombatSide): Character[] {
        if (side instanceof Team) {
            return side.getAll();
        }
        return [side];
    }

    private pickTarget(defenders: Character[], randomTarget: boolean): Character {
        if (!randomTarget || defenders.length === 1) {
            return defenders[0];
        }

        const index = Math.floor(Math.random() * defenders.length);
        return defenders[index];
    }

    private isAlive(char: Character): boolean {
        const normalizedHp = Math.max(0, char.stats.hp);
        char.stats.hp = normalizedHp;
        char.stats.isAlive = normalizedHp > 0 ? 1 : 0;
        return char.stats.isAlive > 0;
    }

    private normalize(value: number): number {
        if (!Number.isFinite(value)) return 0;
        return Math.max(0, Math.round(value * 100) / 100);
    }
}
