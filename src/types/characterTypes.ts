import { Character } from '../classes';
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from '../constants';
import { CallbackParams } from './callBackTypes';

type AttackType = keyof typeof ATTACK_TYPE_CONST;

interface AttackResult {
    value: number;
    type: AttackType;
    atacker: Character | undefined;
    recordId?: number;
}

type DefenceType = keyof typeof DEFENCE_TYPE_CONST;
interface DefenceObject {
    value: number;
    type: DefenceType;
    attacker: Character | null;
    recordId?: number;
}

interface Stats {
    accuracy: number;
    attack: number;
    attackInterval: number;
    attackSpeed: number;
    crit: number;
    critMultiplier: number;
    totalHp: number;
    defence: number;
    evasion: number;
    hp: number;
    regeneration: number;
};

type keysOfStats = keyof Stats;

type CharacterConstructor = Partial<Omit<Character, 'stats'> & {
    stats?: Partial<Stats>,
}>;

type CharacterCallbacks = {
    missAttack?: (params: CallbackParams) => AttackResult | undefined,
    criticalAttack?: (params: CallbackParams) => AttackResult | undefined,
    normalAttack?: (params: CallbackParams) => AttackResult | undefined,
    afterAnyAttack?: (params: CallbackParams) => AttackResult | undefined,
    missDefence?: (params: CallbackParams) => DefenceObject | undefined,
    trueDefence?: (params: CallbackParams) => DefenceObject | undefined,
    evasionDefence?: (params: CallbackParams) => DefenceObject | undefined,
    normalDefence?: (params: CallbackParams) => DefenceObject | undefined,
    afterAnyDefence?: (params: CallbackParams) => DefenceObject | undefined,
    die?: (params: CallbackParams) => void,
    receiveDamage?: (params: CallbackParams) => void,
    removeStatus?: (params: CallbackParams) => void,
    revive?: (params: CallbackParams) => void,
    updateHp?: (params: CallbackParams) => void,
    beforeBattle?: (params: CallbackParams) => any,
    afterBattle?: (params: CallbackParams) => any,
    beforeTurn?: (params: CallbackParams) => any;
    afterTurn?: (params: CallbackParams) => any;
};

export {
    AttackResult,
    AttackType,
    CharacterCallbacks,
    CharacterConstructor,
    DefenceType,
    DefenceObject,
    Stats,
    keysOfStats,
};
