import { Stats } from '../src/Classes/Stats';
import { DEFAULT_STATS } from '../src/constants/stats.constants';


const EXAMPLE_STATS = {
    attack: 10,
    defence: 5,
    hp: 100,
    totalHp: 100,
    isAlive: 1 as 1 | 0,
};


interface ExtraStats {
    agility: number;
}

describe('Stats', () => {
    it('should initialize with DEFAULT_STATS when no values are provided', () => {
        const stats = new Stats();

        expect(stats.getProp('attack')).toBe(DEFAULT_STATS.attack);
        expect(stats.getProp('defence')).toBe(DEFAULT_STATS.defence);
        expect(stats.getProp('hp')).toBe(DEFAULT_STATS.hp);
        expect(stats.getProp('totalHp')).toBe(DEFAULT_STATS.totalHp);
        expect(stats.getProp('isAlive')).toBe(1);
    });

    it('should use provided values and compute totalHp correctly if hp > totalHp', () => {
        const stats = new Stats({
            hp: 120,
            totalHp: 100,
        });
        expect(stats.getProp('totalHp')).toBe(120); // hp wins
        expect(stats.getProp('hp')).toBe(120);
    });

    it('should clamp hp to totalHp if set above it', () => {
        const stats = new Stats({ totalHp: 100, hp: 90 });
        stats.getProp('hp');
        stats.setProp('hp', 200); // try to over-heal
        expect(stats.getProp('hp')).toBe(100); // clamped
    });

    it('should set isAlive to 0 when hp drops to 0', () => {
        const stats = new Stats();
        stats.setProp('hp', 0);
        expect(stats.getProp('hp')).toBe(0);
        expect(stats.getProp('isAlive')).toBe(0);
    });

    it('should allow setting custom keys (extended type)', () => {
        const stats = new Stats<ExtraStats>({
            agility: 15,
            hp: 80,
            totalHp: 100,
            attack: 20,
            defence: 10,
            isAlive: 1,
        });

        expect(stats.getProp('agility')).toBe(15);
        stats.setProp('agility', 30);
        expect(stats.getProp('agility')).toBe(30);
    });

    it('should throw when getPropting a non-existent key (optional)', () => {
        const stats = new Stats({});
        // This one depends on whether you want to handle it with a try/catch or not.
        expect(() => stats.getProp('nonexistent' as any)).toThrow();
    });

    it('should receive damage', () => {
        const stats = new Stats({hp: 50});

        expect(stats.getProp('totalHp')).toBe(50);
        expect(stats.getProp('hp')).toBe(50);

        stats.receiveDamage(20);

        expect(stats.getProp('totalHp')).toBe(50);
        expect(stats.getProp('hp')).toBe(30);

        stats.receiveDamage(40);

        expect(stats.getProp('totalHp')).toBe(50);
        expect(stats.getProp('hp')).toBe(0);
        expect(stats.getProp('isAlive')).toBe(0);
    });

    it('should heal and not over totalHp', () => {
        const stats = new Stats({hp: 50, totalHp: 70});

        expect(stats.getProp('totalHp')).toBe(70);
        expect(stats.getProp('hp')).toBe(50);

        stats.heal(100);

        expect(stats.getProp('totalHp')).toBe(70);
        expect(stats.getProp('hp')).toBe(70);
    });
});
