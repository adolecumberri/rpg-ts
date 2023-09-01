import LevelManager from '../../src/classes/characterModules/LevelManager';
import Character from '../../src/classes/Character';
import { STATUS_TYPES } from '../../src/constants';

describe('LevelManager', () => {
  it('should gain experience and level up', () => {
    const xpNeededFunction = (level: number) => level * 100; // Example XP requirement function
    const statsProgression = {
      hp: { type: STATUS_TYPES['BUFF_FIXED'], value: 10 },
      attack: { type: STATUS_TYPES['BUFF_PERCENTAGE'], value: 10 },
    };

    const levelManager = new LevelManager({
      maxLevel: 5,
      xpNeededFunction,
      statsProgression,
    });

    const character = new Character({levelManager});

    // Gain enough experience to level up from level 1 to level 2
    levelManager.gainExperience(100, character);
    expect(levelManager.currentLevel).toBe(2);

    // Gain enough experience to level up from level 2 to level 3
    levelManager.gainExperience(300, character);
    expect(levelManager.currentLevel).toBe(3);
  });

  it('should adjust character stats when leveling up', () => {
    const xpNeededFunction = (level: number) => level * 100;
    const statsProgression = {
        hp: { type: STATUS_TYPES['BUFF_FIXED'], value: 10 },
        attack: { type: STATUS_TYPES['BUFF_PERCENTAGE'], value: 10 },
    };

    const levelManager = new LevelManager({
      maxLevel: 5,
      xpNeededFunction,
      statsProgression,
    });

    const character = new Character({levelManager});
    const initialHp = character.stats.hp;
    const initialAttack = character.stats.attack;

    // Gain enough experience to level up from level 1 to level 2
    levelManager.gainExperience(100, character);

    // Check if hp and attack stats have increased as expected
    expect(character.stats.hp).toBe(initialHp + 10);
    expect(character.stats.attack).toBe(initialAttack * 1.1);
  });

  it('should trigger level-up callbacks', () => {
    const xpNeededFunction = (level: number) => level * 100;
    const levelUpCallback = jest.fn();
    const levelManager = new LevelManager({
      maxLevel: 5,
      xpNeededFunction,
      levelUpCallbacks: {
        2: levelUpCallback,
      },
    });

    const character = new Character({
        levelManager: levelManager,
    });

    // Add a level-up callback for level 2
    levelManager.addLevelUpCallback(3, levelUpCallback);

    // Gain enough experience to level up from level 1 to level 2
    levelManager.gainExperience(100, character);

    // Check if the level-up callback was called
    expect(levelUpCallback).toHaveBeenCalled();
  });
});
