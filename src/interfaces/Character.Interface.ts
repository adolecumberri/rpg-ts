
import Character from "../classes/Character"
import LogManager from "../classes/LogManager"
import SkillManager from "../classes/SkillManager"
import Status from "../classes/Status"
import StatusManager from "../classes/StatusManager"
import discriminators from "../constants/discriminators"
import { AttackObject, DefenceObject, Enriched } from "./Common.Interface"

type GenericCharacter<T extends object> = T & {
    callbacks: CallBacks
    discriminator: discriminators
    id: number
    isAlive: boolean
    LogManager: LogManager
    minDamageDealt: number
    name: string
    originalStats: Partial<Stats>
    originalRest: any
    SkillManager: SkillManager
    StatusManager: StatusManager
    stats: Partial<Stats> & Record<string, any>
    statsAffected: Partial<Stats> & { [x: string]: any }
    addStatus(status: Status | Status[]): void
    afterTurn() : void
    attack() : AttackObject
    beforeTurn(): void
    defend(attackObject: AttackObject): DefenceObject
    defenceFunction: DefenceFunction<any>
    getAttribute(characterKey: string):typeof Character[keyof typeof Character]
    getDefenceFunction():DefenceFunction<any>
    getProb(): number
    getStat(statKey: string): any
    kill():void
    removeStatus(status: Status | number): void
    revive():void
    rand(max: number, min:number): number
    setAttribute (key: keyof typeof Character, value: any): void
    setCallback<T extends { name: string }>(key: string, cb: T): void
    setDefenceFunction(df: DefenceFunction<any>): void
    setFunction<T>(newFunction: any): void
    setStat(key: keyof Stats, value: number): void
    setMultipleStats(statsObject: Partial<Stats>): void
    setStats(statsObject: Partial<Stats>): void
    enrich<T extends { name: string }>(anything: T): T & Enriched
}

type AnyCharacterType = {
    new <T extends object>(arg?: T): GenericCharacter<T>
}

type CallBacks = {
    [x in keyof typeof Character]?: (arg?: any) => any // declarar tipo.
}

type Stats = {
    accuracy: number
    attack: number
    attack_interval: number
    attack_speed: number
    crit: number
    crit_multiplier: number
    total_hp?: number
    defence: number
    evasion: number
    hp: number
    discriminator: discriminators.STATS
} & Record<string, any>

type StatsKeys = Extract<keyof Stats, string>

type Constructor = Partial<{
    callbacks: CallBacks
    discriminator: discriminators
    id: number
    isAlive: boolean
    LogManager: LogManager
    minDamageDealt: number
    name: string
    originalStats: Partial<Stats>
    originalRest: any
    SkillManager: SkillManager
    StatusManager: StatusManager
    stats: Partial<Stats> & Record<string, any>
    statsAffected: Partial<Stats> & { [x: string]: any }
    addStatus(status: Status | Status[]): void
    afterTurn() : void
    attack() : AttackObject
    beforeTurn(): void
    defend(attackObject: AttackObject): DefenceObject
    defenceFunction: DefenceFunction<any>
    getAttribute(characterKey: string):typeof Character[keyof typeof Character]
    getDefenceFunction():DefenceFunction<any>
    getProb(): number
    getStat(statKey: string): any
    kill():void
    removeStatus(status: Status | number): void
    revive():void
    rand(max: number, min:number): number
    setAttribute (key: keyof typeof Character, value: any): void
    setCallback<T extends { name: string }>(key: string, cb: T): void
    setDefenceFunction(df: DefenceFunction<any>): void
    setFunction<T>(newFunction: any): void
    setStat(key: keyof Stats, value: number): void
    setMultipleStats(statsObject: Partial<Stats>): void
    setStats(statsObject: Partial<Stats>): void
    enrich<T extends { name: string }>(anything: T): T & Enriched
}> & Record<string, any>

type DefenceFunction<T> = {
    (param: T): DefenceObject
} & Enriched


export {
    AnyCharacterType,
    CallBacks,
    Stats,
    DefenceFunction,
    Constructor,
    StatsKeys
}