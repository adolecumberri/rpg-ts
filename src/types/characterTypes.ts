import { BaseCharacter, Character } from '../classes';
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from '../constants';

type AttackType = keyof typeof ATTACK_TYPE_CONST;

interface AttackResult {
    value: number;
    type: AttackType;
    atacker: Character | undefined;
}

type DefenceType = keyof typeof DEFENCE_TYPE_CONST;

interface DefenceResult {
    value: number;
    type: DefenceType;
    attacker: Character | null;
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
    missDefence?: (params: { c: BaseCharacter, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    trueDefence?: (params: { c: BaseCharacter, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    evasionDefence?: (params: { c: BaseCharacter, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    normalDefence?: (params: { c: BaseCharacter, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    afterAnyDefence?: (params: { c: BaseCharacter, attack: AttackResult, defence: DefenceResult }) => DefenceResult | undefined,
    die?: (c: BaseCharacter) => void,
    receiveDamage?: (params: { c?: BaseCharacter, defence?: DefenceResult }) => void,
    removeStatus?: (c: BaseCharacter) => void,
    revive?: (c: BaseCharacter) => void,
    updateHp?: (c: BaseCharacter) => void,
    beforeBattle?: (c: BaseCharacter) => void,
    afterBattle?: (c: BaseCharacter) => void,
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
