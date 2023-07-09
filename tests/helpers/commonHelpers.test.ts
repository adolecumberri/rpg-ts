import { createDefaultObjectGetter, getRandomInt, uniqueID } from '../../src/helpers/commonHelpers';

describe('commonHelpers', () => {
  describe('createDefaultObjectGetter', () => {
    test('should return the default object when no parameter is provided', () => {
      const defaultObject = { value: 10 };
      const defaultObjectGetter = createDefaultObjectGetter(defaultObject);

      expect(defaultObjectGetter()).toEqual(defaultObject);
    });

    test('should merge the default object with the provided parameter', () => {
      const defaultObject = { value: 10 };
      const parameter = { value: 20 };
      const expectedObject = { value: 20 };
      const defaultObjectGetter = createDefaultObjectGetter(defaultObject);

      expect(defaultObjectGetter(parameter)).toEqual(expectedObject);
    });
  });

  describe('getRandomInt', () => {
    test('should return a random integer within the specified range', () => {
      const min = 0;
      const max = 100;
      const randomInt = getRandomInt(0, max);

      expect(randomInt).toBeGreaterThanOrEqual(min);
      expect(randomInt).toBeLessThanOrEqual(max);
      expect(Number.isInteger(randomInt)).toBe(true);
    });
  });

  describe('uniqueID', () => {
    test('should return a unique ID', () => {
      const id1 = uniqueID();
      const id2 = uniqueID();

      expect(id1).not.toBe(id2);
    });
  });
});
