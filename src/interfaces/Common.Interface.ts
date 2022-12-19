import { CharacterClass } from "../classes/Character";
import discriminators from "../constants/discriminators";
import { IActivateReturn } from "./Status.interface";

type AttackObjectTypes = "NORMAL" | "CRITICAL" | "MISS" | string;
type IDeffenceObjectTypes = "NORMAL" | "EVASION" | string;

interface AttackObject {
    discriminator: typeof discriminators["ATTACK_OBJECT"];
    value: number;
    type?: AttackObjectTypes;
    status?: IActivateReturn
}

interface DefenceObject {
    discriminator: typeof discriminators["DEFENCE_OBJECT"];
    value: number;
    type?: IDeffenceObjectTypes;
}

interface Enriched {
    character?: CharacterClass,
    callback?: (arg: any) => any
}

export { AttackObject, DefenceObject, AttackObjectTypes, IDeffenceObjectTypes, Enriched };
