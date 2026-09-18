import type { UnlockCondition, UnlockContext } from './conditions';

export type StatBonus = {
    stat: 'attack' | 'defence' | 'totalHp';
    value: number;
};

export type SkillNode = {
    id: string;
    name: string;
    description: string;
    // SkillSpec id granted when the node is learned.
    skillId?: string;
    // Permanent stat bonuses applied when the node is learned.
    statBonuses?: StatBonus[];
    conditions: UnlockCondition[];
};

/**
 * A skill tree per unit. The learned state lives here, so each
 * character can have its own progress on its tree.
 */
export class SkillTree {
    readonly learned: Set<string> = new Set();

    constructor(public readonly nodes: SkillNode[]) {}

    node(id: string): SkillNode | undefined {
        return this.nodes.find((node) => node.id === id);
    }

    isLearned(id: string): boolean {
        return this.learned.has(id);
    }

    canUnlock(node: SkillNode, context: UnlockContext): boolean {
        return !this.learned.has(node.id) && node.conditions.every((condition) => condition.isMet(context));
    }

    unlock(node: SkillNode, context: UnlockContext): boolean {
        if (!this.canUnlock(node, context)) {
            return false;
        }

        this.learned.add(node.id);

        for (const bonus of node.statBonuses ?? []) {
            context.character.stats[bonus.stat] += bonus.value;
            if (bonus.stat === 'totalHp') {
                context.character.stats.hp += bonus.value;
            }
        }

        return true;
    }

    unlockableNodes(context: UnlockContext): SkillNode[] {
        return this.nodes.filter((node) => this.canUnlock(node, context));
    }

    learnedSkillIds(): string[] {
        return this.nodes
            .filter((node) => this.learned.has(node.id))
            .map((node) => node.skillId)
            .filter((skillId): skillId is string => Boolean(skillId));
    }
}
