
import { Character, Combat, CombatSide, Team } from "../../src";
import { CombatEngine } from "../../src/classes/Combat/CombatEngine";
import { EnemyTarget } from "../../src/classes/Skills";
import { Menu } from "../menu/Menu";
import { CreateMainCharacter } from "../NPC/mainCharacter";
import { ScreenManager } from "../UI/ScreenManager";



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
    private menu: Menu;

    private combatLog: string[] = [];

    constructor(menu: Menu) {
        this.menu = menu;
    }

    async startBattle(left: CombatParticipant, right: CombatParticipant): Promise<{
        winner: "left" | "right" | "draw";
    }> {
        let round = 1;

        while (this.isAlive(left.side) && this.isAlive(right.side)) {
            // console.clear();
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

    }

    private async enemyAction(
        attacker: Character,
        defender: Character
    ) {
        this.resolveAttack(attacker, defender);

        console.log(
            `${attacker.name} attacks ${defender.name}`
        );

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

    // -------------------------
    // RANDOM BATTLE
    // -------------------------

    async startBattleToTestSkills(
        playerTeam: Team,
        enemyTeam: Team,
        screenManager: ScreenManager
    ): Promise<{ winner: "left" | "right" | "draw" }> {
        const combatEngine = new CombatEngine();

        while (this.isAlive(playerTeam) && this.isAlive(enemyTeam)) {

            // --- Player turn ---
            for (const attacker of this.getAlive(playerTeam)) {
                if (!this.isAlive(enemyTeam)) break;

                const enemies = this.getAlive(enemyTeam);
                const allies = this.getAlive(playerTeam);

                const options = [
                    {
                        label: "Use Skill",
                        execute: async () => {
                            const skill = await screenManager.skill.selectSkill(attacker.skills);

                            let explicitTargets: Character | undefined = await screenManager.character.selectMultipleCharacters(
                                enemies,
                                skill.numberOfTargets,
                                skill.multipleSelections 
                            ).then(selection => selection[0]?.character);

                            const CE = new CombatEngine();

                            CE.executeSkill({
                                skill,
                                attacker,
                                allies: playerTeam,
                                enemies: enemyTeam,
                                explicitTargets: explicitTargets ? [explicitTargets] : undefined,
                            })

                            // if (skill.targeting === "ENEMY") {
                            //     const selections = await screenManager.character.selectMultipleCharacters(
                            //         enemies,
                            //         1,
                            //         false
                            //     );
                            //     explicitTargets = selections.map(s => s.character);
                            // } else if (skill.targeting === "ALLY") {
                            //     const selections = await screenManager.character.selectMultipleCharacters(
                            //         allies,
                            //         1,
                            //         false
                            //     );
                            //     explicitTargets = selections.map(s => s.character);
                            // }

                            // combatEngine.executeSkill({
                            //     skill,
                            //     attacker,
                            //     allies: playerTeam,
                            //     enemies: enemyTeam,
                            //     explicitTargets,
                            // });

                            this.combatLog.push(
                                JSON.stringify(skill),
                                JSON.stringify(explicitTargets),
                            );
                            this.combatLog.push(
                                `${attacker.name} used ${skill.name}`
                            );

                            return true;
                        },
                    },

                ];

                const index = await this.menu.selectMenuOption(
                    [
                        ...this.combatLog.slice(-10),
                        "",
                        `${attacker.name}'s turn`,
                    ].join("\n"),
                    options
                );

                await options[index].execute();
            }

            // --- Enemy turn ---
            for (const attacker of this.getAlive(enemyTeam)) {
                if (!this.isAlive(playerTeam)) break;

                const defender = this.pickTarget(this.getAlive(playerTeam));
                await this.enemyAction(attacker, defender);
            }
        }

        const leftAlive = this.isAlive(playerTeam);
        const rightAlive = this.isAlive(enemyTeam);

        if (leftAlive && !rightAlive) return { winner: "left" };
        if (rightAlive && !leftAlive) return { winner: "right" };
        return { winner: "draw" };
    }

    async battleToTestFlow(
        playerTeam: Team,
        enemyTeam: Team,
        screenManager: ScreenManager
    ): Promise<{ winner: "left" | "right" | "draw" }> {
        const combatEngine = new CombatEngine();

        while (this.isAlive(playerTeam) && this.isAlive(enemyTeam)) {

            // --- Player turn ---
            for (const attacker of this.getAlive(playerTeam)) {
                if (!this.isAlive(enemyTeam)) break;

                const enemies = this.getAlive(enemyTeam);
                const allies = this.getAlive(playerTeam);

                const options = [
                    {
                        label: "Use Skill",
                        execute: async () => {
                            const skill = await screenManager.skill.selectSkill(attacker.skills);
                            console.log({ skill })
                            let explicitTargets: Character | undefined = await screenManager.character.selectMultipleCharacters(
                                enemies,
                                1,
                                false
                            ).then(selection => selection[0]?.character);

                            const CE = new CombatEngine();

                            CE.executeSkill({
                                skill,
                                attacker,
                                allies: playerTeam,
                                enemies: enemyTeam,
                                explicitTargets: explicitTargets ? [explicitTargets] : undefined,
                            })

                            // if (skill.targeting === "ENEMY") {
                            //     const selections = await screenManager.character.selectMultipleCharacters(
                            //         enemies,
                            //         1,
                            //         false
                            //     );
                            //     explicitTargets = selections.map(s => s.character);
                            // } else if (skill.targeting === "ALLY") {
                            //     const selections = await screenManager.character.selectMultipleCharacters(
                            //         allies,
                            //         1,
                            //         false
                            //     );
                            //     explicitTargets = selections.map(s => s.character);
                            // }

                            // combatEngine.executeSkill({
                            //     skill,
                            //     attacker,
                            //     allies: playerTeam,
                            //     enemies: enemyTeam,
                            //     explicitTargets,
                            // });

                            this.combatLog.push(
                                `${attacker.name} used ${skill.name}`
                            );

                            return true;
                        },
                    },
                    {
                        label: "Back",
                        execute: async () => {
                            return false;
                        },
                    }
                ];

                const index = await this.menu.selectMenuOption(
                    [
                        ...this.combatLog.slice(-10),
                        "",
                        `${attacker.name}'s turn`,
                    ].join("\n"),
                    options
                );

                await options[index].execute();
            }

            // --- Enemy turn ---
            for (const attacker of this.getAlive(enemyTeam)) {
                if (!this.isAlive(playerTeam)) break;

                const defender = this.pickTarget(this.getAlive(playerTeam));
                await this.enemyAction(attacker, defender);
            }
        }

        const leftAlive = this.isAlive(playerTeam);
        const rightAlive = this.isAlive(enemyTeam);

        if (leftAlive && !rightAlive) return { winner: "left" };
        if (rightAlive && !leftAlive) return { winner: "right" };
        return { winner: "draw" };
    }
}