import discriminators from "../constants/discriminators";
import M from "../constants/messages";
import { ATTACK_TYPE, DEFENCE_TYPE } from "../constants/types";
import { getNestedPropByString, isPrimitiveType, uniqueID } from "../helper";
import { getDefaultAttackObject, getDefaultDefenceObject, getStatsObject } from "../helper/object";
import { AttackObject, CallBacks, AnyCharacterType, Constructor, DefenceFunction, Enriched, Stats, StatsKeys } from "../interfaces";
import { TCharacter } from "../interfaces/Character.interface";
import LogManager from "./LogManager";
import SkillManager from "./SkillManager";
import Status from "./Status";
import StatusManager from "./StatusManager";

/*
* Callbacks llamados con la function.name.
* las cosas deberían ser privadas y se accede por getters/setters.
*/
class CharacterClass {

    callbacks: CallBacks = {}

    discriminator = discriminators.CHARACTER;

    id: number;

    isAlive: boolean;

    LogManager: LogManager;

    minDamageDealt = 0;

    name: string = 'Character';

    originalStats: Partial<Stats>;

    originalRest;

    SkillManager: SkillManager;

    StatusManager: StatusManager;

    stats: Partial<Stats> & Record<string, any>

    statsAffected: Partial<Stats> & {
        [x: string]: any
    } = {}

    constructor(config?: Constructor) {
        this.originalRest = config;

        let {
            stats,
            id,
            isAlive,
            name,
            ...rest
        } = config || {}

        //all the unexpected values will be added to the class.
        for (let key in rest) {
            this[key] = rest[key]
        }

        let total_hp = 0, hp = 0
        if (stats?.total_hp && stats?.hp) {
            total_hp = stats?.total_hp //si la vida es >, vida total = la vida
            hp = stats?.hp > stats?.total_hp ? stats?.total_hp : stats?.hp //si la vida es >, la vida = vida total
        } else if (stats?.total_hp && !stats?.hp) {
            total_hp = stats?.total_hp
            hp = stats?.total_hp
        } else if (!stats?.total_hp && stats?.hp) {
            hp = stats?.hp
            total_hp = stats?.hp
        } else if (!stats?.total_hp && !stats?.hp) {
            //default
        }

        this.stats = getStatsObject({ ...stats, total_hp, hp })
        this.originalStats = this.stats;
        this.id = id ? id : uniqueID();
        this.isAlive = isAlive === undefined ? true : isAlive;
        this.name = name;
        this.StatusManager = new StatusManager({ character: this });
        this.SkillManager = new SkillManager({ character: this })
        this.LogManager = new LogManager({ character: this })
    }

    /**
    * 
    * @param status Status or Status[] to add into the statusManager
    */
    addStatus = (status: Status | Status[]) => {
        this.StatusManager.activate("BEFORE_ADD_STATUS");

        this.StatusManager.addStatus(status);

        if ((status as Status).discriminator) {
            this.LogManager && this.LogManager.addLogStatus((status as Status), 'added')
        } else {
            (status as Status[]).forEach(stat => {
                this.LogManager && this.LogManager.addLogStatus(stat, 'added')
            })
        }

        this.StatusManager.activate("AFTER_ADD_STATUS");
        this.callbacks['addStatus'] && this.callbacks['addStatus']()
    };

    /**
    ** statusManager: "AFTER_TURN"
    ** logManager: addLog "after turn"
    ** callbacks: attack 
    */
    afterTurn = () => {
        this.StatusManager.activate("AFTER_TURN");
        this.LogManager && this.LogManager.addLog('after turn')
        this.callbacks['afterTurn'] && this.callbacks['afterTurn']()
    };

    /**
    * Loads Attack.
    ** statusManager: "BEFORE_ATTACK"
    ** statusManager: "AFTER_ATTACK"
    ** logManager: addLogFromAttackObject(solution: AttackObject)
    ** callbacks: attack 
    ** TODO: update before/after _attack
    */
    attack() {
        //if activate('BEFORE_ATTACK') returns an AttackObject, solution will be initializes with it
        let solution = getDefaultAttackObject(
            this.StatusManager.activate("BEFORE_ATTACK") as any
        )
        let { accuracy, crit, crit_multiplier, attack } = this.stats;

        if (accuracy < this.getProb()) {
            solution.type = ATTACK_TYPE.MISS;
        } else if (crit >= this.getProb()) {
            solution.value = attack * crit_multiplier;
            solution.type = ATTACK_TYPE.CRITICAL;
        } else {
            // normal hit
            solution.value = attack;
        }

        this.StatusManager.activate("AFTER_ATTACK");

        let callbackSolution = this.callbacks['attack'] && this.callbacks['attack']()
        solution = callbackSolution ? callbackSolution : solution;

        this.LogManager && this.LogManager.addLogFromAttackObject(solution)

        return solution;
    }

    /*
    ** statusManager: "BEFORE_TURN"
    ** logManager: addLog "before turn"
    ** callbacks: beforeTurn 
    */
    beforeTurn = () => {
        this.StatusManager.activate("BEFORE_TURN");
        this.LogManager && this.LogManager.addLog('before turn')
        this.callbacks['beforeTurn'] && this.callbacks['beforeTurn']()
    };

    /**
    * Loads Attack object after go throw defence.
    ** statusManager: "BEFORE_DEFENCE"
    ** statusManager: "AFTER_DEFENCE"
    ** logManager: addLogFromDefenceObject(solution: DefenceObject)
    ** callbacks: defend 
    ** TODO: update before/after _attack
    */
    defend(attackObject: AttackObject) {
        this.StatusManager.activate("BEFORE_DEFENCE");

        let solution = this.defenceFunction(attackObject);

        this.StatusManager.activate("AFTER_DEFENCE");

        let callbackSolution = this.callbacks['defend'] && this.callbacks['defend']()
        solution = callbackSolution ? callbackSolution : solution;

        this.LogManager && this.LogManager.addLogFromDefenceObject(solution)

        return solution;
    }

    /**
    * Load a DefenceObject.
    ** default:
    * @param attackObject By default it's an AttackObject but can be anything
    * @returns DefenceObject: Defence object calculated with attackObject and this.stats
    ** overrided (if enriched)
    * @param any
    * @defenceFunction.[keyof Enriched] can use every Enriched property as own.
    * @return DefenceObject 
    */
    defenceFunction: DefenceFunction<any> = (attackObject) => {
        let defenceObject = getDefaultDefenceObject();

        if (this.stats.evasion >= this.getProb()) {
            defenceObject.type = DEFENCE_TYPE.EVASION;
            defenceObject.value = 0;
        } else {
            defenceObject.value = attackObject.value - this.stats.defence;
            if (typeof this.minDamageDealt === 'number' && defenceObject.value <= Number(this.minDamageDealt)) {
                defenceObject.value = this.minDamageDealt;
            }
        }

        return defenceObject;
    }

    /**
    * Get any Character attribute.
    * @param characterKey stat key os stacked stats keys
    * example:
    ** stat -> this.stat
    ** stat.attack -> this.stat : { attack }
    * @returns searched property
    */
    getAttribute(characterKey: string) {
        if (!characterKey) return undefined;
        return getNestedPropByString(this, characterKey as string)
    };

    getDefenceFunction() {
        return this.defenceFunction
    }

    /**
    * get random between 1 and 100
    */
    getProb = () => this.rand(100, 1);

    /**
    * Get anyStat.
    * @param statKey stat key os stacked stats keys
    * example:
    ** attack -> stats.attack
    ** attack.mainAttack.whatever -> stats.attack: { mainAttack: { whatever } }
    * @returns searched property
    */
    getStat(statKey: string) {
        if (!statKey) return undefined;
        return getNestedPropByString(this.stats, statKey)
    };

    /**
    * kills the character.
    ** hp = 0
    ** isAlive = fales 
    */
    kill() {
        this.isAlive = false;
        this.stats.hp = 0;
    }

    /**
     * 
     * @param status a Status to remove or an Id to eliminate
     */
    removeStatus(status: Status | number) {
        this.StatusManager.activate("BEFORE_REMOVE_STATUS");

        let removedStatus = typeof status === 'number' ?
            this.StatusManager.removeStatusById(status) :
            this.StatusManager.removeStatus(status)

        this.LogManager.addLogStatus(removedStatus, 'removed')
        this.StatusManager.activate("AFTER_REMOVE_STATUS");
    };

    /**
    * revive the character
    ** hp = total_hp
    ** isAlive = true
    */
    revive() {
        this.isAlive = true;
        this.stats.hp = this.stats.total_hp
    }

    rand = (max: number, min = 0) => Math.round(Math.random() * (max - min) + min);

    /**
    * sets Any atribute of the Character. if the value it's not a primitive will be enriched.
    * @param key keyof Character
    * @param value 
    */
    setAttribute(key: keyof typeof CharacterClass, value: any) {
        if ((key as string).includes('.')) throw Error(M.errors.nested_unsupported)

        if (isPrimitiveType(value)) {
            this[key] = value
        } else {
            this[key] = this.enrich(value)
        }

        this.LogManager.addLog(`attribute ${key} setted`)
    }

    /**
    * Adds enriched callbacks to the callbackObject.
    * @param key key for the this.callbacks object
    * @param cb the expected callback.
    */
    setCallback = <T extends { name: string }>(key: string, cb: T) => {
        this.callbacks[key] = this.enrich(cb)
    };

    /**
    * enrichs the new defence function.
    * @param df new defence function
    */
    setDefenceFunction(df: DefenceFunction<any>) {
        this.defenceFunction = this.enrich(df)
    };

    /** 
    * @param key stat key 
    * @param value stat value.
    ** if hp or total_hp === 0, kills the character.
    ** if total_hp is lower than current hp, overrides hp value.
    ** LogManager: addLog 'stat setted: [key]'.
    ** Callback: setStat
    */
    setStat(key: keyof Stats, value: number) {
        if ((key === "hp" || key === "total_hp") && value <= 0) this.kill();
        if (key === 'total_hp' && value < this.stats['hp']) this.stats['hp'] = value;
        if (key === 'hp' && value > this.stats['total_hp']) this.stats['total_hp'] = value;

        this.stats[key] = value;

        //LOG
        this.LogManager.addLog(`stat setted: key:${key}, value:${value}`)

        this.callbacks['setStat'] && this.callbacks['setStat']()
    };

    /**
    * set multiple stats one by one.
    * @param statsObject a Partial of Stats.
    ** for each param, it will pass throw setStat to be added.
    ** LogManager: addLog 'stat setted: ${statsObject[key]' for each stat.
    ** Callback: setStat
    */
    setMultipleStats(statsObject: Partial<Stats>) {

        Object.keys(statsObject).forEach((key: StatsKeys) => {
            this.setStat(key, statsObject[key])
            this.LogManager.addLog(`stat setted: ${statsObject[key]}`)
        })

        this.callbacks['setStat'] && this.callbacks['setStat']()
    }

    /**
    * override the stats property directly.
    * @param statsObject: Partial of Stats
    ** LogManager: addLog stats overrided (added discriminator)
    ** Callback: setStat
    */
    setStats(statsObject: Partial<Stats>) {
        statsObject.discriminator = discriminators.STATS

        this.stats = statsObject

        this.LogManager.addLog(`stats overrided`)

        this.callbacks['setStat'] && this.callbacks['setStat']()
    }

    /**
    * 
    * @param anything expected a function so it has a name property.
    ** Enrichement:
    *  - character: this.
    *  - callback: this.callbacks of anything.name.
    * 
    * after enrichment, the "anything" function will be able to do "anything.character" and work with the embeded params as own properties
    * 
    ** LogManager: addLog ${anything.name} enriched.
    * @returns the parameter but enriched.
    */
    enrich = <T extends { name: string }>(anything: T): T & Enriched => {
        let solution = anything as T & Enriched
        solution.character = this
        // solution.callback = this.callbacks[anything.name]

        this.LogManager.addLog(`${anything.name} enriched.`)
        return solution as T
    }
}

const Character = CharacterClass as TCharacter

export {
    Character,
    CharacterClass,
    TCharacter
}

export default Character
