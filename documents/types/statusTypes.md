# Status Types

- `StatusDurationPermanent`: This interface defines the shape of a permanent status duration.

- `StatusDurationTemporal`: This interface defines the shape of a temporary status duration, which includes an optional value for the duration in turns.

- `StatusActivationFunction`: This type defines the shape of a function that activates a status effect.

- `StatusType`: This type is an enumeration of the keys of the `STATUS_TYPES` object.

- `StatusDuration`: This type is a union of `StatusDurationPermanent` and `StatusDurationTemporal`.

- `StatusApplicationMoment`: This type is an enumeration of the keys of the `STATUS_APPLICATION_MOMENTS` object.

- `StatusUsageFrequency`: This type is an enumeration of the keys of the `STATUS_USAGE_FREQUENCY` object.

- `AffectedStatDescriptor`: This interface defines the shape of a descriptor for a statistic affected by a status effect.

- `StatusConstructor`: This interface defines the shape of a constructor for creating new status instances.
