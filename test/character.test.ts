import { Character } from '../src/Classes/Character';


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
            stats: { attack: 50, defence: 10, totalHp: 100, hp: 100 },
            role: 'warrior',
        });

        expect(char.stats.getProp('attack')).toBe(50);
        expect(char.getData().role).toBe('warrior');
    });

    it('should apply damage and update alive status', () => {
        const char = new Character({ stats: { hp: 10 } });
        char.receiveDamage(10);

        expect(char.stats.getProp('hp')).toBe(0);
        expect(char.isAlive()).toBe(false);
    });

    it('should correctly export to JSON', () => {
        const char = new Character<{ class: string }>({
            id: 'test-1',
            stats: { attack: 30 },
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

    it('carton', () => {
        type TYPE_OF_COLOR = 'R' | 'U' | 'G' | 'W' | 'B' | 'Colorless';
        interface carton {
            color: TYPE_OF_COLOR,
            manaValue: Partial<{
                [x in TYPE_OF_COLOR]: number
            }>,
            description: string,
            img: any,
            baseAttack: number,
            baseThougness: number,
            attack: (...arg: any[]) => number,
            thougness: (...arg: any) => number,
        }


        const carton = new Character<carton>({
            manaValue: {
                Colorless: 1,
            },
            attack: (self: Character<carton>, enemy: Character<carton>) => {
                const attack1 = self.getProp('baseAttack');
                const attack2 = enemy.getProp('baseAttack');

                return attack1 + attack2;
            },
        });
    });
});
