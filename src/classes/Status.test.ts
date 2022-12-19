import { basic_character } from "../constants/testing/character"
import { poison, attBuff, breakDefence, blindCurse, test3, test2, test1, defenceDebuff, attackBoost, hardDefenceDebuff } from "../constants/testing/status"
import StatusManagerClass from "./StatusManager";
import { test_1_1_2, test_1_2_2, test_2_1_2, test_2_2_2 } from '../constants/testing/status_by_default'
import { ITemporal } from "../interfaces/Status.interface";
import StatusClass from "./Status";
import { CharacterClass } from "./Character";

/**
LEGEND:
durationType:       whenToApply             appliedOn
| TEMPORAL   |     1 |  ONCE       |   1   |  AFTER_ADD_STATUS      |   1
| PERMANENT  |     2 |  PER_ACTION |   2   |  AFTER_ATTACK          |   2
                                   |       |  AFTER_DEFENCE         |   3
                                   |       |  AFTER_DIE             |   4
                                   |       |  AFTER_REMOVE_STATUS   |   5
                                   |       |  AFTER_TURN            |   6
                                   |       |  BEFORE_ADD_STATUS     |   7   
                                   |       |  BEFORE_ATTACK         |   8
                                   |       |  BEFORE_DEFENCE        |   9
                                   |       |  BEFORE_DIE            |   10 
                                   |       |  BEFORE_REMOVE_STATUS  |   11    
                                   |       |  BEFORE_TURN           |   12

*/

describe('Status Manager works as expected', () => {

    //they do not have states to alter the character.
    test_1_1_2.setCharacter(basic_character)
    test_1_2_2.setCharacter(basic_character)
    test_2_1_2.setCharacter(basic_character)
    test_2_2_2.setCharacter(basic_character)

    test('example Status are as expected', () => {
        expect(test_1_1_2.whenToApply).toBe('ONCE')
        expect(test_1_1_2.duration.type).toBe('TEMPORAL')
        expect((test_1_1_2.duration as ITemporal).value).toBe(1)

        expect(test_1_2_2.whenToApply).toBe('PER_ACTION')
        expect(test_1_2_2.duration.type).toBe('TEMPORAL')
        expect((test_1_2_2.duration as ITemporal).value).toBe(1)

        expect(test_2_1_2.whenToApply).toBe('ONCE')
        expect(test_2_1_2.duration.type).toBe('PERMANENT')
        expect((test_2_1_2.duration as ITemporal).value).toBeFalsy()

        expect(test_2_2_2.whenToApply).toBe('PER_ACTION')
        expect(test_2_2_2.duration.type).toBe('PERMANENT')
        expect((test_2_2_2.duration as ITemporal).value).toBeFalsy()
    })

    test('status can be activated', () => {
        //
        expect(test_1_1_2.hasAlreadyBeenApplied).toBe(false)
        expect(test_1_1_2.isActive).toBe(true)
        expect(test_1_1_2.timesApplied).toBe(0)
        test_1_1_2.activate()
        expect(test_1_1_2.hasAlreadyBeenApplied).toBe(true)
        expect(test_1_1_2.isActive).toBe(false)
        expect(test_1_1_2.timesApplied).toBe(1)

        //
        expect(test_1_2_2.hasAlreadyBeenApplied).toBe(false)
        expect(test_1_2_2.isActive).toBe(true)
        expect(test_1_2_2.timesApplied).toBe(0)
        test_1_2_2.activate()
        expect(test_1_2_2.hasAlreadyBeenApplied).toBe(true)
        expect(test_1_2_2.isActive).toBe(false)
        expect(test_1_2_2.timesApplied).toBe(1)

        //
        expect(test_2_1_2.hasAlreadyBeenApplied).toBe(false)
        expect(test_2_1_2.isActive).toBe(true)
        expect(test_2_1_2.timesApplied).toBe(0)
        test_2_1_2.activate()
        expect(test_2_1_2.hasAlreadyBeenApplied).toBe(true)
        expect(test_2_1_2.isActive).toBe(true)
        expect(test_2_1_2.timesApplied).toBe(1)

        //
        expect(test_2_2_2.hasAlreadyBeenApplied).toBe(false)
        expect(test_2_2_2.isActive).toBe(true)
        expect(test_2_2_2.timesApplied).toBe(0)
        test_2_2_2.activate()
        expect(test_2_2_2.hasAlreadyBeenApplied).toBe(true)
        expect(test_2_2_2.isActive).toBe(true)
        expect(test_2_2_2.timesApplied).toBe(1)

    })

    test('stat afected added', () => {
        let newStatus = new StatusClass({
            statsAffected: [{
                from: 'total_hp',
                to: 'hp',
                type: "BUFF_PERCENTAGE",
                value: 20,
                source: "originalStats",
                restExample: 'example' //I can add whatever I want.
            }],
            appliedOn: "AFTER_ATTACK",
            duration: {
                type: "TEMPORAL",
                value: 1
            },
            whenToApply: "ONCE",
            name: 'test_cabronazo'
        });

        let dead_character = new CharacterClass({
            isAlive: false
        })

        newStatus.setCharacter(dead_character);

        let activationSolution = newStatus.activate()
        //because when character is dead it do not execute
        expect(activationSolution).toEqual({
            statsAffected: newStatus.statsAffected,
            value: {},
            statusLastExecution: false, //TODO_ corregir. poco descriptivo
        })

        dead_character.revive()
        activationSolution = newStatus.activate()

        expect(activationSolution.value).toEqual({ hp: 0 })
        expect(activationSolution.statusLastExecution).toBe(true)
        expect(activationSolution.restExample).toBe('example')
    })

    test('recover stats work as expected', () => {
        let newStatus = new StatusClass({
            statsAffected: [{
                from: 'total_hp',
                to: 'total_hp',
                type: "BUFF_FIXED",
                value: 2000,
                source: "stats",
                recovers: true
            },
            {
                from: 'total_hp',
                to: 'total_hp',
                type: "DEBUFF_FIXED",
                value: 500,
                source: "stats",
            },],
            appliedOn: "AFTER_ATTACK",
            duration: {
                type: "PERMANENT",
            },
            whenToApply: "ONCE",
            name: 'TEST',
            recovers: true
        });
        let character = new CharacterClass({})
        newStatus.setCharacter(character)
        newStatus.activate()
        newStatus.activate()
        expect(character.stats.total_hp).toBe(1500)
        expect(character.stats.hp).toBe(0)

        newStatus.recoverStats()
        //logic error. the +2000 total_hp are recovered but the -500total_hp no. 
        // that's why you get a final total_hp negative
        expect(character.stats.total_hp).toBe(0) 
        expect(character.stats.hp).toBe(0)

        newStatus.resetStatus()
        expect(newStatus.hasAlreadyBeenApplied).toBeFalsy()
        newStatus.setIsActive(false)
    })

    test('addDuration works as expected', () => {
        let newStatus = new StatusClass({
            statsAffected: [],
            appliedOn: "AFTER_ATTACK",
            duration: {
                type: "TEMPORAL",
                value: 3
            },
            whenToApply: "ONCE",
            name: 'TEST',
        });

        expect((newStatus.duration as ITemporal).value).toBe(3)
        newStatus.addDuration({value: -1, type: 'TEMPORAL'})
        expect((newStatus.duration as ITemporal).value).toBe(0)
        newStatus.addDuration({value: 0, type: "TEMPORAL"})
        expect((newStatus.duration as ITemporal).value).toBe(0)
    })

    test('activate works as intended', () => {
        let a = test_1_1_2

        test_1_1_2.resetStatus()
        expect(test_1_1_2.statsAffected.length).toBe(0)

        test_1_1_2.addStatsAffected([ 
            hardDefenceDebuff, //-20%
            attackBoost //+10
        ])
        expect(test_1_1_2.statsAffected.length).toBe(2)

        test_1_1_2.setCharacter(
            new CharacterClass({
                stats: {
                    attack: 20,
                    defence: 100,
                    hp: 1000
                }
            })
        )
        
        expect(test_1_1_2.character.stats.attack).toBe(20)
        expect(test_1_1_2.character.stats.defence).toBe(100)
        expect(test_1_1_2.character.stats.hp).toBe(1000)

        let solution = test_1_1_2.activate()

        expect(test_1_1_2.character.stats.attack).toBe(30)
        expect(test_1_1_2.character.stats.defence).toBe(80)
        expect(test_1_1_2.character.stats.hp).toBe(1000)
    
            console.log({solution})
    
    })
})