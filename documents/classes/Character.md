# Character Class

The Character class represents a character in the game, complete with stats and the ability to manage its own status effects. The class uses helper functions and constants defined elsewhere in the project to initialize and manage its properties.

## Properties

| Property           | Type                              | Description                                                   |
|------------------- |---------------------------------- |-------------------------------------------------------------- |
| id                 | number                            | A unique identifier for the character.                        |
| isAlive            | boolean                           | Indicates whether the character is alive or dead.             |
| name               | string                            | The name of the character.                                    |
| originalStats      | Partial<Stats>                    | The original (i.e., base) stats of the character.             |
| stats              | Stats                             | The current stats of the character, which may be modified by status effects. |
| statusManager      | StatusManager \| null             | The StatusManager instance used to manage the character's status effects. If null, the character does not have a status manager. |

## Methods

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
| revive            | `(): void`                

## Dynamic Constructors

| Method            | Arguments                                      | Return        | Description                                                          |
|-------------------|------------------------------------------------|---------------|----------------------------------------------------------------------|
| dynamic constructor | `arg: DynamicCharacterConstructor` | `Character` | Initializes a new character. This constructor is dynamic and can handle additional properties outside of the standard ones, which can be useful when importing data from external sources. |
