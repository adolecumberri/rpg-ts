import { StatsModifiers } from "../src/Classes/stats/StatsModifiers";
import { MODIFICATION_TYPES } from "../src/constants/common.constants";


describe("StatsModifiers", () => {

    test("1️⃣ Calcula correctamente una estadística sin modificadores", () => {
        const statsModifier = new StatsModifiers();

        const result = statsModifier.calculateStatValue("attack");

        expect(result).toBe(100);
    });

    test("2️⃣ Aplica modificadores fijos correctamente (buff y debuff)", () => {
        const statsModifier = new StatsModifiers();

        // Añadimos modificadores fijos
        statsModifier.setModifier("attack", MODIFICATION_TYPES.BUFF_FIXED, 20);  // +20
        statsModifier.setModifier("attack", MODIFICATION_TYPES.DEBUFF_FIXED, 10); // -10

        const result = statsModifier.calculateStatValue("attack");

        // 100 + 20 - 10 = 110
        expect(result).toBe(110);
    });

    test("3️⃣ Aplica correctamente modificadores porcentuales y fijos combinados", () => {
        const statsModifier = new StatsModifiers();

        // Buff fijo: +20, debuff fijo: -10
        statsModifier.setModifier("attack", MODIFICATION_TYPES.BUFF_FIXED, 20,);
        statsModifier.setModifier("attack", MODIFICATION_TYPES.DEBUFF_FIXED, 10);

        // Buff porcentual: +10%, debuff porcentual: -5%
        statsModifier.setModifier("attack", MODIFICATION_TYPES.BUFF_PERCENTAGE, 10);
        statsModifier.setModifier("attack", MODIFICATION_TYPES.DEBUFF_PERCENTAGE, 5);

        const result = statsModifier.calculateStatValue("attack");

        /**
         * Cálculo esperado:
         * base 100 + 20 - 10 = 110
         * porcentaje = +10% - 5% = +5%
         * 110 * 1.05 = 115.5
         */
        expect(result).toBeCloseTo(115.5, 2);
    });
});
