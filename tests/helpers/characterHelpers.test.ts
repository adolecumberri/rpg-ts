import { getDefaultAttackObject, getDefaultDefenceObject } from '../../src/helpers/characterHelpers';
import { DEFAULT_ATTACK_OBJECT, DEFAULT_DEFENCE_OBJECT } from '../../src/constants';

describe('characterHelpers', () => {
  describe('getDefaultAttackObject', () => {
    test('should return the default attack object', () => {
      expect(getDefaultAttackObject()).toEqual(DEFAULT_ATTACK_OBJECT);
    });
  });

  describe('getDefaultDefenceObject', () => {
    test('should return the default defence object', () => {
      expect(getDefaultDefenceObject()).toEqual(DEFAULT_DEFENCE_OBJECT);
    });
  });
});
