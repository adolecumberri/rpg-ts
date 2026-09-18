import { PreviousNodeCondition } from '../skillTree/conditions';
import type { UnlockContext } from '../skillTree/conditions';
import type { SkillTree } from '../skillTree/skillTree';

export type SkillTreeNodeView = {
    id: string;
    name: string;
    description: string;
    learned: boolean;
    unlockable: boolean;
};

export type SkillTreeEdgeView = {
    from: string;
    to: string;
};

export type SkillTreeView = {
    nodes: SkillTreeNodeView[];
    edges: SkillTreeEdgeView[];
};

export function buildSkillTreeView(tree: SkillTree, context: UnlockContext): SkillTreeView {
    const nodes: SkillTreeNodeView[] = tree.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        description: node.description,
        learned: tree.isLearned(node.id),
        unlockable: tree.canUnlock(node, context),
    }));

    const edges: SkillTreeEdgeView[] = [];
    for (const node of tree.nodes) {
        for (const condition of node.conditions) {
            if (condition instanceof PreviousNodeCondition) {
                edges.push({ from: condition.previousNodeId, to: node.id });
            }
        }
    }

    return { nodes, edges };
}
