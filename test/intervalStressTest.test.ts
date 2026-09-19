import { INTERVAL_STRESS_TEST, buildIntervalStressCombatants } from '../worldTest/core/config/intervalStressTest';

describe('interval stress battles', () => {
    it('keeps the fixed battle sizes documented in the config', () => {
        expect(INTERVAL_STRESS_TEST.small.allies.length).toBe(6);
        expect(INTERVAL_STRESS_TEST.small.enemies.length).toBe(10);
        expect(INTERVAL_STRESS_TEST.big.allies.length).toBe(8);
        expect(INTERVAL_STRESS_TEST.big.enemies.length).toBe(16);
        expect(INTERVAL_STRESS_TEST.huge.allies.length).toBe(15);
        expect(INTERVAL_STRESS_TEST.huge.enemies.length).toBe(30);
        expect(INTERVAL_STRESS_TEST.giant.allies.length).toBe(80);
        expect(INTERVAL_STRESS_TEST.giant.enemies.length).toBe(120);
    });

    it('builds every fighter with a unique id per battle', () => {
        for (const size of ['small', 'big', 'huge', 'giant'] as const) {
            const { left, right } = buildIntervalStressCombatants(size);
            const ids = [...left, ...right].map((entry) => entry.character.id);
            expect(new Set(ids).size).toBe(ids.length);
        }
    });

    it('builds characters with positive hp and a valid interval', () => {
        for (const size of ['small', 'big', 'huge', 'giant'] as const) {
            const { left, right } = buildIntervalStressCombatants(size);
            for (const entry of [...left, ...right]) {
                expect(entry.character.stats.totalHp).toBeGreaterThan(0);
                expect(entry.interval).toBeGreaterThanOrEqual(1);
            }
        }
    });
});
