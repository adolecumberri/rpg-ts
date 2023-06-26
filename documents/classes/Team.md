# Team Class

The Team class represents a team in the game. It contains a list of Character instances and provides methods for adding and removing members, checking the team's status, and getting a list of alive or dead members.

## Properties

| Property           | Type                              | Description                                                   |
|------------------- |---------------------------------- |-------------------------------------------------------------- |
| id                 | number                            | A unique identifier for the team.                        |
| members            | Character[]                       | The list of team members.                                     |

| Method | Arguments | Return | Description |
|---|---|---|---|
| constructor | `con?: TeamConstructor` | `Team` | Initializes a new team. |
| addMember | `<T extends Character>(character: T): void` | `void` | Adds a member to the team. |
| hasMember | `<T extends Character>(character: T): boolean` | `boolean` | Checks if a character is a member of the team. |
| removeMemberById | `(id: number): void` | `void` | Removes a member from the team by ID. |
| removeMember | `<T extends Character>(character: T): void` | `void` | Removes a member from the team. |
| getAliveMembers | `(): Character[]` | `Character[]` | Returns the team members that are alive. |
| isTeamAlive | `(): boolean` | `boolean` | Checks if the team is alive (has at least one member alive). |
| getDeadMembers | `(): Character[]` | `Character[]` | Returns the team members that are dead. |

## Dynamic Constructors

| Method            | Arguments                      | Return      | Description                                                                                     |
|-------------------|--------------------------------|-------------|-------------------------------------------------------------------------------------------------|
| dynamic constructor | `arg: DynamicTeamConstructor` | `Team`      | Initializes a new team. This constructor is dynamic and can handle additional properties outside of the standard ones, which can be useful when importing data from external sources. |
