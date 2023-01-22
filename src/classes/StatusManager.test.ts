import {BASIC_CHARACTER} from '../constants/testing/character';
import {test1, test2, test3} from '../constants/testing/status';
import StatusManagerClass from './StatusManager';

describe('Status Manager works as expected', () => {
  const char = BASIC_CHARACTER;
  const SM = new StatusManagerClass();

  test('add and remove status', () => {
    SM.addStatus([test1,
      test2,
      test3], char);
    expect(SM.statusList.length).toBe(3);
    // TODO:
    let solution = SM.activate('BEFORE_TURN', char);
    // TODO:
    console.log(solution);
    solution = SM.activate('BEFORE_TURN', char);

    console.log(solution);
  });
});
