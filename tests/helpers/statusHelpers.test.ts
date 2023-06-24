import { getDefaultStatus } from '../../src/helpers/statusHelpers';
import { DEFAULT_STATUS_OBJECT } from '../../src/constants';

describe('statusHelpers', () => {
  describe('getDefaultStatus', () => {
    test('should return the default status object', () => {
      expect(getDefaultStatus()).toEqual(DEFAULT_STATUS_OBJECT);
    });
  });
});