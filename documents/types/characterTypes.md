# Character Types

- `AttackType`: This type is an enumeration of the keys of the `ATTACK_TYPE_CONST` object.

- `AttackResult`: This interface defines the shape of an attack result, including the damage value and the type of attack.

- `DefenceType`: This type is an enumeration of the keys of the `DEFENCE_TYPE_CONST` object.

- `DefenceResult`: This interface defines the shape of a defense result, including the defense value and the type of defense.

- `Stats`: This interface defines the shape of a character's statistics, including accuracy, attack power, attack interval, attack speed, critical hit rate, critical hit multiplier, total health points, defense, evasion, and current health points.

- `keysOfStats`: This type is an enumeration of the keys of the `Stats` object.

- `Constructor`: This type defines the shape of a constructor for creating new character instances. The constructor can partially specify the character's properties, excluding `statusManager` and `stats`, which are required.
