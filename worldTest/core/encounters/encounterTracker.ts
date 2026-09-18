/**
 * Counts victories per place. Used to trigger special encounters
 * after X encounters in a location.
 */
export class EncounterTracker {
    private victories: Map<string, number> = new Map();

    recordVictory(placeId: string): number {
        const next = (this.victories.get(placeId) ?? 0) + 1;
        this.victories.set(placeId, next);
        return next;
    }

    victoriesAt(placeId: string): number {
        return this.victories.get(placeId) ?? 0;
    }

    snapshot(): { placeId: string; victories: number }[] {
        return Array.from(this.victories, ([placeId, victories]) => ({ placeId, victories }));
    }

    setVictories(placeId: string, victories: number): void {
        if (victories <= 0) {
            this.victories.delete(placeId);
            return;
        }
        this.victories.set(placeId, victories);
    }

    reset(placeId: string): void {
        this.victories.delete(placeId);
    }

    resetAll(): void {
        this.victories.clear();
    }
}
