import {BASIC_CHARACTER} from '../constants/testing/character';
import {poison, attBuff, breakDefence, blindCurse, test1, test2, test3} from '../constants/testing/status';
import StatusManagerClass from './StatusManager';

describe('Status Manager works as expected', () => {
  const char = BASIC_CHARACTER;
  const SM = new StatusManagerClass({
    character: char,
  });

  test('add and remove status', () => {
    SM.addStatus([test1,
      test2,
      test3]);
    expect(SM.statusList.length).toBe(3);
    // TODO:
    let solution = SM.activate('BEFORE_TURN');
    // TODO:
    console.log(solution);
    solution = SM.activate('BEFORE_TURN');

    console.log(solution);
  });
});
