import { STATUS_TYPES } from '../../constants';
import { Stats } from '../../types';
import Character from '../Character';

class LevelManager {
  currentLevel: number = 1;
  experience: number = 0;
  maxLevel: number;
  xpNeededFunction: (arg: any) => number = (level: number) => Math.floor(3 + (level - 1));
  xpGivenFunction: (arg: any) => number =(level: number) => Math.floor(1 + (level - 1));
  statsProgression: {
    [key in keyof Stats]?: {
      type: keyof typeof STATUS_TYPES;
      value: number;
    };
  } = {};
  levelUpCallbacks: { [key: number]: (c?:Character)=> void } = {};

  constructor(con?: Partial<LevelManager>) {
    Object.assign(this, con);
  }

  addLevelUpCallback(level: number, callback: (c?:Character)=> void) {
    this.levelUpCallbacks[level] = callback;
  }

  adjustStats(character: Character) {
    const ACTION = {
      [STATUS_TYPES.BUFF_FIXED]: this.loadBuffFixed,
      [STATUS_TYPES.BUFF_PERCENTAGE]: this.loadBuffPercentage,
      [STATUS_TYPES.DEBUFF_FIXED]: this.loadDebuffFixed,
      [STATUS_TYPES.DEBUFF_PERCENTAGE]: this.loadDebuffPercentage,
    };

    Object.keys(this.statsProgression).forEach((statKey) => {
      if (!character.stats[statKey]) return; // si el personaje no tiene la stat que se quiere subir, no hace nada.

      const stat = this.statsProgression[statKey]; // El value
      character.stats[statKey] = ACTION[stat.type](
        character.stats[statKey],
        stat.value,
      );
    });
  }

  static deserialize(json) {
    const parsedData = JSON.parse(json);

    const levelManager = new LevelManager({
      currentLevel: parsedData.currentLevel,
      experience: parsedData.experience,
      maxLevel: parsedData.maxLevel,
      xpNeededFunction: parsedData.xpNeededFunction,
      statsProgression: parsedData.statsProgression,
      levelUpCallbacks: parsedData.levelUpCallbacks,
    });

    return levelManager;
  }

  checkLevelUp(character: Character) {
    while (this.experience >= this.xpNeededFunction(this.currentLevel)) {
      this.levelUp(character);
    }
  }

  gainExperience(amount, character: Character) {
    this.experience += amount;
    this.checkLevelUp(character);
  }

  levelUp(character: Character) {
    if (this.currentLevel < this.maxLevel) {
      const remainingExperience =
        this.experience - this.xpNeededFunction(this.currentLevel);
      this.currentLevel++;
      this.adjustStats(character);

      // Execute level-up callback if defined
      if (this.levelUpCallbacks[this.currentLevel]) {
        this.levelUpCallbacks[this.currentLevel](character);
      }

      this.experience = remainingExperience;
    }
  }

  loadBuffFixed = (stat: number, value: number) => stat + value;

  loadBuffPercentage = (stat: number, value: number) =>
    stat + stat * (value / 100);

  loadDebuffFixed = (stat: number, value: number) => stat - value;

  loadDebuffPercentage = (stat: number, value: number) =>
    stat - stat * (value / 100);

  serialize() {
    return JSON.stringify({
      currentLevel: this.currentLevel,
      experience: this.experience,
      maxLevel: this.maxLevel,
      xpNeededFunction: this.xpNeededFunction,
      statsProgression: this.statsProgression,
      levelUpCallbacks: this.levelUpCallbacks,
    });
  }
}

export default LevelManager;

export {
  LevelManager,
};
