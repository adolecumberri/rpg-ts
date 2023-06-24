import { DEFAULT_ATTACK_OBJECT, DEFAULT_DEFENCE_OBJECT } from "../constants";
import { DefenceResult, AttackResult } from "../types";

const createDefaultObjectGetter = <T>(defaultObject: T) => (param?: Partial<T>): T => {
    return { ...defaultObject, ...param };
};

const getDefaultDefenceObject = createDefaultObjectGetter<DefenceResult>(DEFAULT_DEFENCE_OBJECT);
const getDefaultAttackObject = createDefaultObjectGetter<AttackResult>(DEFAULT_ATTACK_OBJECT);

export {
    getDefaultDefenceObject,
    getDefaultAttackObject,
}
