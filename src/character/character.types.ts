import { Character } from './character';

type BaseStats = {
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
    isAlive: 1 | 0;
  };

interface AttackResult {
    type: string;
    value: number;
    atacker?: Character;
    recordId?: number;
}

type CharacterConstructor<T> = Partial<Omit<Character<T>, 'stats'> & {
    stats: Partial<BaseStats> & T;
}>

export {
    AttackResult,
    BaseStats,
    CharacterConstructor,
};
