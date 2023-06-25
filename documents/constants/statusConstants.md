# Status Constants

The following constants define various aspects of status effects:

- `STATUS_DURATIONS`: An object that defines the possible durations of status effects. The possible values are `PERMANENT` and `TEMPORAL`.

- `STATUS_APPLICATION_MOMENTS`: An object that defines the possible moments of application of status effects. The possible values are `AFTER_ATTACK`, `AFTER_DEFENCE`, `AFTER_DIE`, `AFTER_REVIVE`, `BEFORE_ATTACK`, `BEFORE_DEFENCE`, `BEFORE_DIE`, and `BEFORE_REVIVE`.

- `STATUS_USAGE_FREQUENCY`: An object that defines the possible usage frequencies of status effects. The possible values are `ONCE` and `PER_ACTION`.

- `STATUS_TYPES`: An object that defines the possible types of status changes. The possible values are `BUFF_FIXED`, `BUFF_PERCENTAGE`, `DEBUFF_FIXED`, and `DEBUFF_PERCENTAGE`.

The following object defines the default values for a status effect:

- `DEFAULT_STATUS_OBJECT`: A status effect object with the following default values:
  - `duration`: An object with type `PERMANENT`.
  - `applyOn`: `AFTER_ATTACK`.
  - `usageFrequency`: `ONCE`.
  - `statsAffected`: An empty array (`[]`).
  - `hasBeenUsed`: `false`.
