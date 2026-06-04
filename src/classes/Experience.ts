import { Character } from "./Character";

export type ExperienceConstructor = {
    level?: number;
    currentXp?: number;
    baseXpToLevel?: number;
    xpGrowthFactor?: number;
    growthFunction?: ExperienceGrowthFunction;
    onLevelUp?: ExperienceLevelUpHandler;
};

export type ExperienceGrowthFunction = (args: {
    level: number;
    baseXpToLevel: number;
    xpGrowthFactor: number;
}) => number;

export type ExperienceLevelUpHandler = (args: {
    previousLevel: number;
    newLevel: number;
    levelsGained: number;
}) => void;

export class Experience {
    level: number;
    currentXp: number;
    baseXpToLevel: number;
    xpGrowthFactor: number;
    growthFunction?: ExperienceGrowthFunction;
    onLevelUpHandler?: ExperienceLevelUpHandler;

    constructor(config: ExperienceConstructor = {}) {
        this.level = Math.max(1, config.level ?? 1);
        this.currentXp = Math.max(0, config.currentXp ?? 0);
        this.baseXpToLevel = Math.max(1, config.baseXpToLevel ?? 100);
        this.xpGrowthFactor = Math.max(1, config.xpGrowthFactor ?? 1.2);
        this.growthFunction = config.growthFunction;
        this.onLevelUpHandler = config.onLevelUp;
    }

    getXpToNextLevel(): number {
        const defaultXp = this.baseXpToLevel * Math.pow(this.xpGrowthFactor, this.level - 1);

        if (!this.growthFunction) {
            return Math.max(1, Math.round(defaultXp));
        }

        const computed = this.growthFunction({
            level: this.level,
            baseXpToLevel: this.baseXpToLevel,
            xpGrowthFactor: this.xpGrowthFactor,
        });

        if (!Number.isFinite(computed) || computed <= 0) {
            return Math.max(1, Math.round(defaultXp));
        }

        return Math.max(1, Math.round(computed));
    }

    onLevelUp(callback: ExperienceLevelUpHandler): void {
        this.onLevelUpHandler = callback;
    }

    gain(amount: number): number {
        if (!Number.isFinite(amount) || amount <= 0) {
            return 0;
        }

        let levelsGained = 0;
        this.currentXp += Math.round(amount);

        while (this.currentXp >= this.getXpToNextLevel()) {
            const requiredXp = this.getXpToNextLevel();
            this.currentXp -= requiredXp;
            const previousLevel = this.level;
            this.level += 1;
            levelsGained += 1;

            this.onLevelUpHandler?.({
                previousLevel,
                newLevel: this.level,
                levelsGained,
            });
        }

        return levelsGained;
    }
}