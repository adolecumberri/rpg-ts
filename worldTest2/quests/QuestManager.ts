export interface Quest {
    id: string;
}

export class QuestManager<TQuest extends Quest = Quest> {
    private readonly quests =
        new Map<string, TQuest>();

    add(quest: TQuest) {
        this.quests.set(quest.id, quest);

        return quest;
    }

    remove(questId: string) {
        return this.quests.delete(questId);
    }

    get(questId: string) {
        return this.quests.get(questId);
    }

    has(questId: string) {
        return this.quests.has(questId);
    }

    getAll() {
        return [...this.quests.values()];
    }
}
