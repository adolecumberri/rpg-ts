
import { Character, Combat, CombatSide, Team } from "../../src";
import { Menu } from "../menu/Menu";



type CombatParticipant = {
    side: CombatSide;
    controlledByPlayer: boolean;
};

type TurnResult = {
    attacker: Character;
    defender: Character;
    damage: number;
};

export class CombatController {
    private combat: Combat;
    private menu: Menu;

    private combatLog: string[] = [];

    constructor(menu: Menu, combat: Combat) {
        this.menu = menu;
        this.combat = combat;
    }

    async startBattle(left: CombatParticipant, right: CombatParticipant): Promise<{
        winner: "left" | "right" | "draw";
    }> {
        let round = 1;

        while (this.isAlive(left.side) && this.isAlive(right.side)) {
            console.clear();
            console.log(`=== ROUND ${round} ===`);

            await this.teamTurn(left.side, right.side, left.controlledByPlayer);

            await this.teamTurn(right.side, left.side, right.controlledByPlayer);

            if (!this.isAlive(right.side) || !this.isAlive(left.side)) break;

            round++;

            if (round > 999) break;
        }

        const leftAlive = this.isAlive(left.side);
        const rightAlive = this.isAlive(right.side);

        if (leftAlive && !rightAlive) return { winner: "left" };
        if (rightAlive && !leftAlive) return { winner: "right" };

        return { winner: "draw" };
    }

    // -------------------------
    // TURN SYSTEM
    // -------------------------

    private async teamTurn(attacking: CombatSide, defending: CombatSide, controlledByPlayer: boolean) {
        const attackers = this.getAlive(attacking);

        for (const attacker of attackers) {
            if (!this.isAlive(defending)) return;

            const defenders = this.getAlive(defending);
            const defender = this.pickTarget(defenders);

            if (controlledByPlayer) {
                await this.playerAction(attacker, defender);
            } else {
                await this.enemyAction(attacker, defender);
            }
        }
    }

    private async playerAction(attacker: Character, defender: Character) {
        const options = [
            {
                label: `Attack ${defender.name}`,
                execute: async () => {
                    this.resolveAttack(attacker, defender);
                    return true;
                },
            },
            {
                label: "Defend (skip for now)",
                execute: async () => true,
            },
        ];

        const index = await this.menu.selectMenuOption(
            [
                `=== ROUND ===`,
                ...this.combatLog.slice(-10),
                "",
                `${attacker.name}'s turn`,
            ].join("\n"),
            options
        );

        await options[index].execute();

        await this.menu.waitForAnyKey("Press any key...");
    }

    private async enemyAction(
        attacker: Character,
        defender: Character
    ) {
        this.resolveAttack(attacker, defender);

        console.log(
            `${attacker.name} attacks ${defender.name}`
        );

        await this.menu.waitForAnyKey("Press any key...");
    }

    // -------------------------
    // CORE COMBAT
    // -------------------------

    private resolveAttack(attacker: Character, defender: Character) {
        const attack = attacker.combat.attack(attacker);
        const defence = defender.combat.defence(defender, attack);

        const damage = Math.max(0, defence.value);

        defender.stats.hp = Math.max(0, defender.stats.hp - damage);
        defender.stats.isAlive = defender.stats.hp > 0 ? 1 : 0;

        this.combatLog.push(
            `${attacker.name} hits ${defender.name} for ${damage} damage`
        );
    }

    // -------------------------
    // HELPERS
    // -------------------------

    private getAlive(side: CombatSide): Character[] {
        if (side instanceof Team) {
            return side.getAll().filter(c => c.stats.isAlive > 0);
        }
        return side.stats.isAlive > 0 ? [side] : [];
    }

    private isAlive(side: CombatSide): boolean {
        return this.getAlive(side).length > 0;
    }

    private pickTarget(defenders: Character[]): Character {
        return defenders[Math.floor(Math.random() * defenders.length)];
    }
}