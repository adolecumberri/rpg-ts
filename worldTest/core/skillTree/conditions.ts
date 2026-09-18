import type { Character } from '../../../src';
import type { WorldSession } from '../session';
import type { SkillTree } from './skillTree';

export type UnlockContext = {
    character: Character;
    session: WorldSession;
    tree: SkillTree;
};

export interface UnlockCondition {
    readonly id: string;
    // Human-readable description shown in the UI.
    describe(): string;
    isMet(context: UnlockContext): boolean;
}

export class LevelCondition implements UnlockCondition {
    readonly id = 'level';

    constructor(private readonly level: number) {}

    describe(): string {
        return `Reach level ${this.level}`;
    }

    isMet(context: UnlockContext): boolean {
        return context.character.experience.level >= this.level;
    }
}

export class StatCondition implements UnlockCondition {
    readonly id = 'stat';

    constructor(
        private readonly stat: 'attack' | 'defence' | 'hp' | 'totalHp',
        private readonly threshold: number,
    ) {}

    describe(): string {
        return `${this.stat} ≥ ${this.threshold}`;
    }

    isMet(context: UnlockContext): boolean {
        return context.character.getStat(this.stat) >= this.threshold;
    }
}

export class StatusCondition implements UnlockCondition {
    readonly id = 'status';

    constructor(private readonly statusName: string) {}

    describe(): string {
        return `Have the "${this.statusName}" status`;
    }

    isMet(context: UnlockContext): boolean {
        return Array.from(context.character.statusManager.statuses.values())
            .some((status) => status.definition.name === this.statusName);
    }
}

export class PreviousNodeCondition implements UnlockCondition {
    readonly id = 'previous_node';

    constructor(private readonly nodeId: string) {}

    get previousNodeId(): string {
        return this.nodeId;
    }

    describe(): string {
        return 'Learn the previous node first';
    }

    isMet(context: UnlockContext): boolean {
        return context.tree.isLearned(this.nodeId);
    }
}

export class ItemCondition implements UnlockCondition {
    readonly id = 'item';

    constructor(private readonly itemId: string) {}

    describe(): string {
        return `Own "${this.itemId}"`;
    }

    isMet(context: UnlockContext): boolean {
        return (context.session.team.inventory.getItemSlotByItemId(this.itemId)?.totalQuantity ?? 0) > 0;
    }
}

export class QuestFlagCondition implements UnlockCondition {
    readonly id = 'quest_flag';

    constructor(private readonly flag: string) {}

    describe(): string {
        return `Complete "${this.flag}"`;
    }

    isMet(context: UnlockContext): boolean {
        return context.session.unlocked.has(this.flag);
    }
}
