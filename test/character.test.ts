import { Character } from '../src/Classes/Character';
import { Stats } from '../src/Classes/Stats';


describe('Character', () => {
    it('should initialize with default stats and combat behavior', () => {
        const char = new Character();

        expect(char.isAlive()).toBe(true);
        expect(typeof char.id).toBe('string');
        expect(typeof char.attack()).toBe('object');
        expect(char.stats.getProp('hp')).toBeGreaterThan(0);
    });

    it('should allow custom stats and data', () => {
        const char = new Character<{ role: string }>({
            stats: new Stats({ attack: 50, defence: 10, totalHp: 100, hp: 100 }),
            role: 'warrior',
        });

        expect(char.stats.getProp('attack')).toBe(50);
        expect(char.getProps().role).toBe('warrior');
    });

    it('should apply damage and update alive status', () => {
        const char = new Character({ stats: new Stats({ hp: 10 }) });
        char.receiveDamage(10);

        expect(char.stats.getProp('hp')).toBe(0);
        expect(char.isAlive()).toBe(false);
    });

    it('should correctly export to JSON', () => {
        const char = new Character<{ class: string }>({
            id: 'test-1',
            stats: new Stats({ attack: 30 }),
            class: 'mage',
        });

        const json = char.toJSON();
        expect(json.id).toBe('test-1');
        expect(json.stats.attack).toBe(30);
        expect(json.data.class).toBe('mage');
    });

    it('should get, set and delete dynamic properties', () => {
        const char = new Character<{ job: string }>({ job: 'archer' });

        expect(char.getProp('job')).toBe('archer');

        char.setProp('job', 'knight');
        expect(char.getProp('job')).toBe('knight');

        char.delete('job');
        expect(() => char.getProp('job')).toThrow();
    });

    it('Can access to custom status throw the character', () => {
        interface mageStats {
            mana: number;
            fuego: boolean;
            foo: string;
            agua: number
        }

        const charStats = new Stats<mageStats>({ fuego: true, mana: 100, foo: 'foo', isAlive: 1 });

        charStats.getProp('agua');

        charStats.getProp('fuego');

        const char = new Character<{data: {foo: string}}, mageStats>({
            stats: charStats,
            data: { foo: 'foo' },
        });

        char.stats.getProp('agua');

        // TODO: Pending Tests
    });
});
