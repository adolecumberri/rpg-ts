import { createDefaultObjectGetter } from ".";
import { DEFAULT_ATTACK_OBJECT, DEFAULT_DEFENCE_OBJECT } from "../constants";
import { DefenceResult, AttackResult } from "../types";

const getDefaultDefenceObject = createDefaultObjectGetter<DefenceResult>(DEFAULT_DEFENCE_OBJECT);
const getDefaultAttackObject = createDefaultObjectGetter<AttackResult>(DEFAULT_ATTACK_OBJECT);

export {
    getDefaultDefenceObject,
    getDefaultAttackObject,
}
