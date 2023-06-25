
### RPG-TS ###

# Library Documentation

This library is designed to create and handle characters and their statuses in a role-playing game context. The library consists of three main classes: `Character`, `Status`, and `StatusManager`.

## Character Class

The `Character` class represents a character in the game. Each character has a set of stats and can have a number of statuses applied to them through the `StatusManager` class.

### Methods of the Character class:
| Method            | Arguments                                                                                                     | Return      | Description                            |
|-------------------|--------------------------------------------------------------------------------------------------------------|-------------|----------------------------------------|
| constructor       | `arg?: Partial< Omit< Character, 'statusManager' \| 'stats'> & { statusManager: boolean, stats: Partial<Stats> }>` | `Character` | Initializes a new character.           |
| addStatus         | `(status: Status[] \| Status): void`                                                                         | `void`      | Adds a status or a list of statuses to the character. |
| attack            | `(): AttackResult`                                                                                            | `AttackResult` | Performs an attack, which can be normal, critical, or failed. |
| calculateDamage   | `(type: AttackType, stats: Stats): number`                                                                    | `number`    | Calculates the damage dealt by an attack. |
| defend            | `(attack: AttackResult): DefenceResult`                                                                       | `DefenceResult` | Defends from an attack, which can be evaded or damaged. |
| defenceCalculation| `(attack: number) => number`                                                                                  | `number`    | Calculates the character's defence.    |
| die               | `(): void`                                                                                                   | `void`      | Marks the character as dead.           |
| removeStatus      | `(id: number): void`                                                                                         | `void`      | Removes a status from the character.   |
| revive            | `(): void`                                                                                                   | `void`      | Marks the character as alive.          |



## Status Class

The `Status` class represents a status that can be applied to a character. Statuses can have a variety of effects, such as modifying the character's statistics.

### Methods of the Status class:
| Method                    | Arguments                                                                                    | Return      | Description                                   |
|---------------------------|----------------------------------------------------------------------------------------------|-------------|-----------------------------------------------|
| constructor               | `partial: Partial<Omit<StatusConstructor, 'id'>> & Record<string, any>`                      | `Status`    | Initializes a new status.                     |
| activate                  | `(character: Character)`                                                                     | `void`      | Activates the status on a character.          |
| loadBuffFixed             | `({ to, value }: { to: number; value: number }): { valueFinal: number; valueApplied: number; }` | `object`    | Increases a character stat by a fixed value.  |
| loadBuffPercentage        | `({ from, to, value }: { from: number; to: number; value: number }): { valueFinal: number; valueApplied: number; }` | `object`    | Increases a character stat by a percentage.   |
| loadDebuffFixed           | `({ to, value }: { to: number; value: number }): { valueFinal: number; valueApplied: number; }` | `object`    | Decreases a character stat by a fixed value.  |
| loadDebuffPercentage      | `({ from, to, value }: { from: number; to: number; value: number }): { valueFinal: number; valueApplied: number; }` | `object`    | Decreases a character stat by a percentage.   |
| recover                   | `(character: Character)`                                                                     | `void`      | Recovers the character's stats to their previous state. |


## StatusManager Class

The `StatusManager` class is responsible for handling a character's statuses.

### Methods of the StatusManager class:
| Method             | Arguments                                           | Return          | Description                                  |
|--------------------|-----------------------------------------------------|-----------------|----------------------------------------------|
| constructor        | `con?: StatusManagerConstructor`                    | `StatusManager` | Initializes a new status manager.            |
| addStatus          | `(status: Status[] \| Status): void`                | `void`          |



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