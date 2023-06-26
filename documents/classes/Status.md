# Status Class

The Status class represents a status effect that can be applied to a character. It includes properties to define its impact and duration, as well as methods to activate and recover the status effect.

## Properties

| Property       | Type                                                                              | Description                                                       |
|----------------|-----------------------------------------------------------------------------------|-------------------------------------------------------------------|
| id             | number                                                                            | A unique identifier for the status effect.                         |
| name           | string                                                                            | The name of the status effect.                                     |
| duration       | StatusDuration                                                                    | Defines the duration of the status effect.                         |
| applyOn        | StatusApplicationMoment                                                           | Defines when the status effect should be applied.                  |
| usageFrequency | StatusUsageFrequency                                                              | Defines the frequency at which the status effect is used.          |
| statsAffected  | AffectedStatDescriptor[]                                                          | A list of the stats that are affected by the status effect.        |
| hasBeenUsed    | boolean?                                                                          | Indicates whether the status effect has been used.                 |

## Methods

| Method            | Arguments                                                                                    | Return      | Description                                   |
|-------------------|----------------------------------------------------------------------------------------------|-------------|-----------------------------------------------|
| constructor       | `arg: Partial<Omit<StatusConstructor, 'id'>> & Record<string, any>`                          | `Status`   | Initializes a new status effect.              |
| activate          | `(character: Character): void`                                                                | `void`      | Activates the status effect on a character.   |
| loadBuffFixed     | `({ to, value }): { valueFinal: number; valueApplied: number; }`                              | `Object`    | Applies a fixed-value buff.                   |
| loadBuffPercentage| `({ from, to, value }): { valueFinal: number; valueApplied: number; }`                         | `Object`    | Applies a percentage-value buff.              |
| loadDebuffFixed   | `({ to, value }): { valueFinal: number; valueApplied: number; }`                              | `Object`    | Applies a fixed-value debuff.                 |
| loadDebuffPercentage|`({ from, to, value }): { valueFinal: number; valueApplied: number; }`                        | `Object`    | Applies a percentage-value debuff.            |
| recover           | `(character: Character): void`                                                                | `void`      | Recovers the status effect on a character.    |

## Dynamic Constructors

| Method            | Arguments                         | Return        | Description                                                                                     |
|-------------------|-----------------------------------|---------------|-------------------------------------------------------------------------------------------------|
| dynamic constructor | `arg: DynamicStatusConstructor` | `Status`      | Initializes a new status effect. This constructor is dynamic and can handle additional properties outside of the standard ones, which can be useful when importing data from external sources. |
