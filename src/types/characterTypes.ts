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
    missDefence?: <T extends BaseCharacter>(params: { c: T, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    trueDefence?: <T extends BaseCharacter>(params: { c: T, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    evasionDefence?: <T extends BaseCharacter>(params: { c: T, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    normalDefence?: <T extends BaseCharacter>(params: { c: T, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    afterAnyDefence?: <T extends BaseCharacter>(params: {
        c: T,
        attack: AttackResult,
        defence: DefenceResult
    }) => DefenceResult | undefined,
    die?: <T extends BaseCharacter>(c: T, killer: T) => void,
    receiveDamage?: <T extends BaseCharacter>(params: { c?: T, defence?: DefenceResult }) => void,
    removeStatus?: <T extends BaseCharacter>(c: T) => void,
    revive?: <T extends BaseCharacter>(c: T) => void,
    updateHp?: <T extends BaseCharacter>(c: T) => void,
    beforeBattle?: <T extends BaseCharacter>(c: T) => void,
    afterBattle?: <T extends BaseCharacter>(c: T) => void,
    beforeTurn?: <T extends BaseCharacter>(c: T) => void;
    afterTurn?: <T extends BaseCharacter>(c: T) => void;
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
