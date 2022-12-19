import { basic_character } from "../constants/testing/character";
import { poison } from "../constants/testing/status";
import { getDefaultDefenceObject } from "../helper/object";
import LogManagerClass from "./LogManager";


describe('LogManager tests', () => {
    let char = basic_character;
    let LM = new LogManagerClass({
        character: char,
    })

    test('Log "weird" defence object type', ( )=> {
        let defObject = getDefaultDefenceObject({type: 'PERFECT'})
        
        LM.addLogFromDefenceObject(defObject)
        // console.log(LM.logs[0])

        expect(LM.logCounts).toBe(1)
        LM.reset()
        expect(LM.logs.length).toBe(0)
    })

    test('Log Manager can Add Status', () => {
        LM.addLogStatus(poison, "added")
        // console.log(LM.logs[0])
        
        expect(LM.logCounts).toBe(1)
        LM.reset()
        expect(LM.logs.length).toBe(0)
    })

    test('Log Manager displays last log', () => {
        LM.addLog("test log");
        let lastLog = LM.getLastLog()
        // console.log(lastLog)

        expect(lastLog).toBeTruthy()
    })

    test('Log Managers laods header', () => {
        let header = LM.getLogHeader();
        // console.log(header)
        expect(header).toBeTruthy;
    })
})