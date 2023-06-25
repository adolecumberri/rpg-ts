# Character Constants

The following constants define the possible types of attacks and defenses:

- `ATTACK_TYPE_CONST`: An object that defines the possible types of attacks. The possible values are `NORMAL`, `MISS`, `CRITICAL`, and `TRUE`.

- `DEFENCE_TYPE_CONST`: An object that defines the possible types of defenses. The possible values are `NORMAL`, `EVASION`, and `MISS`.

The following objects define the default values for attacks and defenses:

- `DEFAULT_ATTACK_OBJECT`: An `AttackResult` object with type `NORMAL` and value `0`.

- `DEFAULT_DEFENCE_OBJECT`: A `DefenceResult` object with type `NORMAL` and value `0`.

The following object defines the default statistics for a character:

- `DEFAULT_STATS_OBJECT`: A `Stats` object with the following default values:
  - `accuracy`: 100
  - `attack`: 1
  - `evasion`: 0
  - `totalHp`: 1
  - `defence`: 0
  - `hp`: 1
  - `crit`: 0
  - `critMultiplier`: 1
  - `attackInterval`: 1
  - `attackSpeed`: 1
