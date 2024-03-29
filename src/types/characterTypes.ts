import { BaseCharacter, Character } from '../classes';
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from '../constants';

type AttackType = keyof typeof ATTACK_TYPE_CONST;

interface AttackResult {
    value: number;
    type: AttackType;
    atacker: Character | undefined;
    recordId?: number;
}

type DefenceType = keyof typeof DEFENCE_TYPE_CONST;

interface DefenceResult {
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

type CharacterConstructor = Partial<Omit<BaseCharacter,
    'statusManager' | 'stats' | 'actionRecord'
> & {
    statusManager?: boolean,
    stats?: Partial<Stats>,
    actionRecord?: boolean,
}>;

type DynamicCharacterConstructor = {
    new <T extends object>(arg?: T): T & {
        [x in keyof BaseCharacter]: BaseCharacter[x]
    }
}

type CharacterCallbacks = {
    missAttack?: (params: AttackResult) => AttackResult | undefined,
    criticalAttack?: (params: AttackResult) => AttackResult | undefined,
    normalAttack?: (params: AttackResult) => AttackResult | undefined,
    afterAnyAttack?: (params: AttackResult) => AttackResult | undefined,
    missDefence?: <T extends Character>(params: { c: T, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    trueDefence?: <T extends Character>(params: { c: T, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    evasionDefence?: <T extends Character>(params: { c: T, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    normalDefence?: <T extends Character>(params: { c: T, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    afterAnyDefence?: <T extends Character>(params: {
        c: T,
        attack: AttackResult,
        defence: DefenceResult
    }) => DefenceResult | undefined,
    die?: <T extends Character>(c: T, killer: T) => void,
    receiveDamage?: <T extends Character>(params: { c?: T, defence?: DefenceResult }) => void,
    removeStatus?: <T extends Character>(c: T) => void,
    revive?: <T extends Character>(c: T) => void,
    updateHp?: <T extends Character>(c: T) => void,
    beforeBattle?: <T extends Character>(c: T) => void,
    afterBattle?: <T extends Character>(c: T) => void,
    beforeTurn?: <T extends Character>(c: T) => void;
    afterTurn?: <T extends Character>(c: T) => void;
};

export {
    AttackResult,
    AttackType,
    CharacterCallbacks,
    CharacterConstructor,
    DefenceResult,
    DefenceType,
    Stats,
    keysOfStats,
    DynamicCharacterConstructor,
};
