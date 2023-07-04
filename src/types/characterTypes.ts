import { BaseCharacter, Character } from '../classes';
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from '../constants';

type AttackType = keyof typeof ATTACK_TYPE_CONST;

interface AttackResult {
    value: number;
    type: AttackType;
}

type DefenceType = keyof typeof DEFENCE_TYPE_CONST;

interface DefenceResult {
    value: number;
    type: DefenceType;
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
    missAttack?: (c: BaseCharacter) => void,
    criticalAttack?: (c: BaseCharacter) => void,
    normalAttack?: (c: BaseCharacter) => void,
    afterAnyAttack?: (c: BaseCharacter) => void,
    missDefence?: (c: BaseCharacter) => void,
    trueDefence?: (c: BaseCharacter) => void,
    evasionDefence?: (c: BaseCharacter) => void,
    normalDefence?: (c: BaseCharacter) => void,
    afterAnyDefence?: (c: BaseCharacter) => void,
    die?: (c: BaseCharacter) => void,
    receiveDamage?: (c: BaseCharacter) => void,
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
