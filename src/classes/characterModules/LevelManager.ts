
class LevelManager {
  currentLevel: number;
  experience: number;
  maxLevel: number;
  xpNeededFunction: any;
  statsProgression: any;
  levelUpCallbacks: any;

  constructor(maxLevel, xpNeededFunction, statsProgression) {
    this.currentLevel = 1;
    this.experience = 0;
    this.maxLevel = maxLevel;
    this.xpNeededFunction = xpNeededFunction;
    this.statsProgression = statsProgression;
    this.levelUpCallbacks = {};
  }

  gainExperience(amount) {
    this.experience += amount;
    this.checkLevelUp();
  }

  checkLevelUp() {
    while (this.experience >= this.xpNeededFunction(this.currentLevel)) {
      this.levelUp();
    }
  }

  levelUp() {
    if (this.currentLevel < this.maxLevel) {
      this.currentLevel++;
      this.adjustStats();

      // Execute level-up callback if defined
      if (this.levelUpCallbacks[this.currentLevel]) {
        this.levelUpCallbacks[this.currentLevel]();
      }

      this.experience = 0;
      console.log(`Congratulations! You've reached level ${this.currentLevel}!`);
    } else {
      console.log('You\'re already at the max level.');
    }
  }

  adjustStats() {
    const progression = this.statsProgression[this.currentLevel - 1];
    // Apply the progression to the player's stats
  }
}

// // Example usage
// const maxLevel = 10;
// const xpNeededFunction = level => 100 * level; // Example XP requirement function
// const statsProgression = [
//   { hp: 10, attack: 5, defense: 3 },
//   { hp: 15, attack: 8, defense: 5 },
//   // Define progression values for each level
// ];

// const playerLevelManager = new LevelManager(maxLevel, xpNeededFunction, statsProgression);

// // Example callback for level 5
// playerLevelManager.addLevelUpCallback(5, () => {
//   console.log("Hooray! You've reached level 5!");
//   // You can implement custom behavior here
// });

// // Simulate gaining experience by defeating a character
// const defeatedCharacterLevel = 3; // The defeated character's level
// const xpGained = defeatedCharacterLevel * 20; // Example XP calculation
// playerLevelManager.gainExperience(xpGained); // Trigger level-up checks


