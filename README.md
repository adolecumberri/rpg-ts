
### RPG-TS ###

# Library Documentation

This library is designed to create and handle characters and their statuses in a role-playing game context. The library consists of three main classes: `Character`, `Status`, and `StatusManager`.

## Character Class

The `Character` class represents a character in the game. Each character has a set of stats and can have a number of statuses applied to them through the `StatusManager` class.

### Methods of the Character class:

- `constructor(con?: Constructor)`: Initializes a new character. Accepts an optional object that can contain any number of character properties.

- `addStatus(status: Status[] | Status)`: Adds a status or a list of statuses to the character.

- `attack()`: Performs an attack, which can be normal, critical, or failed.

- `calculateDamage(type: AttackType, stats: Stats)`: Calculates the damage an attack does.

- `defend(attack: AttackResult)`: Defends from an attack, being able to evade or receive damage.

- `defenceCalculation(attack: number)`: Calculates the character's defense.

- `die()`: Marks the character as dead.

- `removeStatus(id: number)`: Removes a status from the character.

- `revive()`: Marks the character as alive.

## Status Class

The `Status` class represents a status that can be applied to a character. Statuses can have a variety of effects, such as modifying the character's statistics.

### Methods of the Status class:

- `constructor(partial: Partial<Omit<StatusConstructor, 'id'>> & Record<string, any>)`: Initializes a new status.

- `activate(character: Character)`: Activates the status on a character.

- `loadBuffFixed`, `loadBuffPercentage`, `loadDebuffFixed`, `loadDebuffPercentage`: These are the activation functions that vary a character's statistics.

- `recover(character: Character)`: Recovers the character's statistics to their previous state.

## StatusManager Class

The `StatusManager` class is responsible for handling a character's statuses.

### Methods of the StatusManager class:

- `constructor(con?: StatusManagerConstructor)`: Initializes a new status manager.

- `addStatus(status: Status[] | Status)`: Adds a status or a list of statuses to the manager.

- `activate(applyOn: StatusApplicationMoment)`: Activates all states that match the provided application moment.

- `removeStatusById(id: number)`: Removes a status from the manager.

## State Types

States can be of different types, and each of them affects a character's statistics in a different way. Here are the available state types:

- `BUFF_FIXED`: Increases a character's stat in a fixed way.

- `BUFF_PERCENTAGE`: Increases a character's stat by a percentage.

- `DEBUFF_FIXED`: Decreases a character's stat in a fixed way.

- `DEBUFF_PERCENTAGE`: Decreases a character's stat by a percentage.

Each status has a determined duration that can be set at the time of status creation. When the status expires, the effects on the character are reverted.

## Installation

To install the RPG-TS library, you can use npm or yarn:

    npm install rpg-ts


## Usage

To use the library, you first need to import the necessary classes:

    import { Character, Status, StatusManager } from 'rpg-ts';
Then you can create characters, assign them statuses, and manage their interactions:

## Contribute

If you are interested in contributing to this project, contact me. If you find any problem or have any suggestions, you can open a new issue.

## License

This library is available under the MIT license.