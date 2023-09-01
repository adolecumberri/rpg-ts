import { STATUS_TYPES } from '../../constants';
import { Stats } from '../../types';
import Character from '../Character';

class LevelManager {
  currentLevel: number = 1;
  experience: number = 0;
  maxLevel: number;
  xpNeededFunction: any;
  statsProgression: {
    [key in keyof Stats]?: {
      type: keyof typeof STATUS_TYPES;
      value: number;
    };
  } = {};
  levelUpCallbacks: { [key: number]: Function } = {};

  constructor(con?: Partial<LevelManager>) {
    Object.assign(this, con);
  }

  gainExperience(amount, character: Character) {
    this.experience += amount;
    this.checkLevelUp(character);
  }

  checkLevelUp(character: Character) {
    while (this.experience >= this.xpNeededFunction(this.currentLevel)) {
      this.levelUp(character);
    }
  }

  levelUp(character: Character) {
    if (this.currentLevel < this.maxLevel) {
      const remainingExperience =
        this.experience - this.xpNeededFunction(this.currentLevel);
      this.currentLevel++;
      this.adjustStats(character);

      // Execute level-up callback if defined
      if (this.levelUpCallbacks[this.currentLevel]) {
        this.levelUpCallbacks[this.currentLevel]();
      }

      this.experience = remainingExperience;
      console.log(
        `Congratulations! You've reached level ${this.currentLevel}!`,
      );
    } else {
      console.log('You\'re already at the max level.');
    }
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

  loadBuffFixed = (stat: number, value: number) => stat + value;

  loadBuffPercentage = (stat: number, value: number) =>
    stat + stat * (value / 100);

  loadDebuffFixed = (stat: number, value: number) => stat - value;

  loadDebuffPercentage = (stat: number, value: number) =>
    stat - stat * (value / 100);
}

export default LevelManager;
