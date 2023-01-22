import {BASIC_CHARACTER} from '../constants/testing/character';
import {poison} from '../constants/testing/status';
import {getDefaultDefenceObject} from '../helper/object';
import LogManagerClass from './LogManager';


describe('LogManager tests', () => {
  const char = BASIC_CHARACTER;
  const LM = new LogManagerClass({
    character: char,
  });

  test('Log "weird" defence object type', ( )=> {
    const defObject = getDefaultDefenceObject({type: 'PERFECT'});

    LM.addLogFromDefenceObject(defObject, char);
    // console.log(LM.logs[0])

    expect(LM.logCounts).toBe(1);
    LM.reset();
    expect(LM.logs.length).toBe(0);
  });

  test('Log Manager can Add Status', () => {
    LM.addLogStatus(poison, 'added', char);
    // console.log(LM.logs[0])

    expect(LM.logCounts).toBe(1);
    LM.reset();
    expect(LM.logs.length).toBe(0);
  });

  test('Log Manager displays last log', () => {
    LM.addLog('test log', char);
    const lastLog = LM.getLastLog();
    // console.log(lastLog)

    expect(lastLog).toBeTruthy();
  });

  test('Log Managers laods header', () => {
    const header = LM.getLogHeader(char);
    // console.log(header)
    expect(header).toBeTruthy;
  });
});
