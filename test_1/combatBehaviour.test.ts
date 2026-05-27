
import { Character } from '../src/Classes/Character';
import { CombatBehavior } from '../src/Classes/CombatBehavior';
import { Stats } from '../src/Classes/Stats';
import { ATTACK_TYPE, DEFENCE_TYPE } from '../src/constants/combat.constants';


const createMockCharacter = () => {
    const stats = new Stats({ attack: 10, defence: 5, hp: 100, totalHp: 100, isAlive: 1 });
    return {
        stats,
        combat: new CombatBehavior(),
    } as Character;
};

describe('CombatBehavior', () => {
    it('uses default attack function if none provided', () => {
        const char = createMockCharacter();
        const result = char.combat.attack(char);

        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('value');
        expect(Object.values(ATTACK_TYPE)).toContain(result.type);
        expect(typeof result.value).toBe('number');
    });

    it('calculates damage for a known type', () => {
        const char = createMockCharacter();
        const damage = char.combat.calculateDamage(ATTACK_TYPE.NORMAL, char.stats);

        expect(typeof damage).toBe('number');
    });

    it('throws on missing damage calculation', () => {
        const char = createMockCharacter();
        const behavior = new CombatBehavior({
            damageCalc: {} as any, // simulate missing config
        });

        expect(() =>
            behavior.calculateDamage('nonexistent_type' as any, char.stats),
        ).toThrowError(/Missing damage calculation/);
    });

    it('uses default defence function', () => {
        const charA = createMockCharacter();
        const charB = createMockCharacter();
        const result = charA.combat.defence(charA, charB.combat.attack(charB));

        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('value');
        expect(Object.values(DEFENCE_TYPE)).toContain(result.type);
        expect(typeof result.value).toBe('number');
    });

    it('calculates defence value correctly', () => {
        const char = createMockCharacter();
        const value = char.combat.calculateDefence(100, char.stats);

        expect(typeof value).toBe('number');
        expect(value).toBeLessThanOrEqual(100);
    });

    it('uses provided config when given', () => {
        const mockAttack = jest.fn().mockReturnValue({
            type: ATTACK_TYPE.CRITICAL,
            value: 999,
        });

        const behavior = new CombatBehavior({
            attackFn: mockAttack,
        });

        const char = createMockCharacter();
        behavior.attack(char);

        expect(mockAttack).toHaveBeenCalled();
    });
});
