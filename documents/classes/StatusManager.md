# StatusManager Class

The StatusManager class manages the application and removal of status effects on a character. It keeps a list of the status effects currently affecting the character and provides methods to add new effects, remove existing effects, and activate effects at the appropriate times.

## Properties

| Property   | Type           | Description                                           |
|------------|----------------|-------------------------------------------------------|
| statusList | Status[]       | A list of the status effects currently affecting the character. |
| character  | Character      | The character who the status manager is managing.     |

## Methods

| Method            | Arguments                            | Return      | Description                                  |
|-------------------|--------------------------------------|-------------|----------------------------------------------|
| constructor       | `arg?: StatusManagerConstructor`     | `StatusManager`| Initializes a new status manager.            |
| addStatus         | `(status: Status[] \| Status): void` | `void`      | Adds a status or a list of statuses to the status manager. |
| activate          | `(applyOn: StatusApplicationMoment): void` | `void`| Activates all status effects that should be applied at the given moment. |
| removeStatusById  | `(id: number): void`                | `void`      | Removes a status effect by its id.           |

## Dynamic Constructors

| Method            | Arguments                            | Return           | Description                                                                                     |
|-------------------|--------------------------------------|------------------|-------------------------------------------------------------------------------------------------|
| dynamic constructor | `arg: DynamicStatusManagerConstructor` | `StatusManager` | Initializes a new status manager. This constructor is dynamic and can handle additional properties outside of the standard ones, which can be useful when importing data from external sources. |

