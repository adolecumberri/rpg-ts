import { Character } from '../src/Classes/Character';
import { CombatBehavior } from '../src/Classes/CombatBehavior';
import { Stats } from '../src/Classes/Stats';
import { AttackResult, AttackType } from '../src/types/combat.types';


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

        char.deleteProp('job');
        expect(() => char.getProp('job')).toThrow();
    });

    describe('Triggers and events', () => {
        it('should emit before_attack and after_attack events', () => {
            const attackFn = jest.fn().mockImplementation((): AttackResult => {
                return { value: 42, type: 'normal' } as AttackResult;
            });

            const combat = new CombatBehavior({
                attackFn,
            });
            const char = new Character({
                combat,
            });

            const beforeAttackHandler = jest.fn();
            const afterAttackHandler = jest.fn();

            char.on('before_attack', beforeAttackHandler);
            char.on('after_attack', afterAttackHandler);

            const result = char.attack();

            expect(attackFn).toHaveBeenCalledTimes(1);

            expect(beforeAttackHandler).toHaveBeenCalledWith(char);
            expect(afterAttackHandler).toHaveBeenCalledWith(result, char);

            expect(result.value).toBe(42);
        });
    });

    it('should preserve attack function argument and return types', () => {
        const combat = new CombatBehavior({
            attackFn: (char: Character, preSetVale: number, preSetType: AttackType): AttackResult => {
                return { value: preSetVale, type: preSetType };
            },
        });

        const char = new Character({
            combat,
        });

        const beforeAttackHandler = jest.fn();
        const afterAttackHandler = jest.fn();


        char.on('before_attack', beforeAttackHandler);
        char.on('after_attack', afterAttackHandler);

        const result = char.combat.attack(char, 7, 'true');

        expect(beforeAttackHandler).toHaveBeenCalledTimes(1);
        expect(afterAttackHandler).toHaveBeenCalledTimes(1);

        expect(result.value).toBe(7);
        expect(result.type).toBe('true');
    });
});
