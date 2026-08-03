
import { Character, Combat, CombatSide, Team } from "../../src";
import { CombatEngine } from "../../src/classes/Combat/CombatEngine";
import { TargetResolver } from "../../src/classes/Combat/TargetResolver";
import { EnemyTarget } from "../../src/classes/Skills";
import { EventMoment } from "../../src/types/generalEvents.types";
import { Menu, MenuChoice } from "../menu/Menu";
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

    private teamTriggerEvent(side: CombatSide, eventName: EventMoment) {
        if (!(side instanceof Team)) {
            throw new Error("teamTriggerEvent can only be called on a Team instance");
        }
        side.getAlive().forEach(c => c.statusManager.trigger(eventName));
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



    async battleToTestFlow(
        playerTeam: Team,
        enemyTeam: Team,
        screenManager: ScreenManager
    ): Promise<{ winner: "left" | "right" | "draw" }> {
        const combatEngine = new CombatEngine();

        while (playerTeam.getAlive().length > 0 && enemyTeam.getAlive().length > 0) {

            //lanzo triggers
            this.teamTriggerEvent(enemyTeam, "before_turn");
            this.teamTriggerEvent(playerTeam, "before_turn");

            // --- Player turn ---
            for (const attacker of playerTeam.getAlive()) {
                if (enemyTeam.getAlive().length === 0) break;

                let turnDone = false;

                while (!turnDone) {
                    const enemies = enemyTeam.getAlive();
                    const allies = playerTeam.getAlive();

                    const options: MenuChoice[] = [
                        {
                            label: "attacker is " + attacker.name + " Team size[" + playerTeam.getAlive().length + "] Enemy size[" + enemyTeam.getAlive().length + "]",
                            isDisabled: true,
                            execute: async () => true,

                        },
                        {
                            label: "Use Skill",
                            execute: async () => {

                                // selectSkill can return null if the player chooses to go back, so we need to handle that case
                                const skillIndex = await screenManager.skill.selectSkill(attacker.skills);
                                if (skillIndex === null) return false; // player chose to go back
                                const skill = attacker.skills[skillIndex];



                                let explicitTargets: Character[] | undefined;
                                // if skill.tageting is in enemyTarget, I will select in the enemi team.
                                // if it´s in the allyTarget, I will select in the ally team.
                                if (skill.targeting === "ENEMY") {
                                    const selectedTargets = await screenManager.character.selectMultipleCharacters(
                                        enemies,
                                        skill.numberOfTargets,
                                        skill.multipleSelections
                                    );
                                    if (selectedTargets === null) return false;
                                    explicitTargets = selectedTargets;
                                } else if (skill.targeting === "ALLY") {
                                    const selectedTargets = await screenManager.character.selectMultipleCharacters(
                                        allies,
                                        skill.numberOfTargets,
                                        skill.multipleSelections
                                    );
                                    if (selectedTargets === null) return false;
                                    explicitTargets = selectedTargets;
                                } else {
                                    explicitTargets = TargetResolver.resolve(
                                        skill,
                                        attacker,
                                        playerTeam,
                                        enemyTeam
                                    );
                                }

                                combatEngine.executeSkill({
                                    skill,
                                    attacker,
                                    allies: playerTeam,
                                    enemies: enemyTeam,
                                    explicitTargets: explicitTargets ? explicitTargets : undefined,
                                })


                                this.combatLog.push(
                                    `${attacker.name} used ${skill.name}`
                                );

                                return true;
                            },
                        },
                        {
                            label: "check enemy team",
                            execute: async () => {
                                await screenManager.game.showTeamStats(enemyTeam);
                                return false;
                            }
                        },
                        {
                            label: "check player team",
                            execute: async () => {
                                await screenManager.game.showTeamStats(playerTeam);
                                return false;
                            },
                        },
                        {
                            label: "Nothing (skip turn)",
                            execute: async () => {
                                return true;
                            },
                        }
                    ];

                    const index = await this.menu.selectMenuOption(
                        [
                            // ...this.combatLog.slice(-10),
                            // "",
                            `${attacker.name}'s turn`,
                        ].join("\n"),
                        options
                    );

                    turnDone = await options[index].execute();
                }


            }

            //lanzo triggers
            this.teamTriggerEvent(enemyTeam, "after_turn");
            this.teamTriggerEvent(playerTeam, "after_turn");
            // --- Enemy turn ---
            // for (const attacker of this.getAlive(enemyTeam)) {
            //     if (!this.isAlive(playerTeam)) break;

            //     const defender = this.pickTarget(this.getAlive(playerTeam));
            //     await this.enemyAction(attacker, defender);
            // }
        }

        const leftAlive = playerTeam.getAlive().length > 0;
        const rightAlive = enemyTeam.getAlive().length > 0;

        if (leftAlive && !rightAlive) return { winner: "left" };
        if (rightAlive && !leftAlive) return { winner: "right" };
        return { winner: "draw" };
    }
}