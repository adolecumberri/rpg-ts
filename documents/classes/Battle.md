# Battle Class

La clase `Battle` representa una batalla en el juego, que puede ser por turnos o basada en intervalos de tiempo.

## Properties

| Property | Type | Description |
|---|---|---|
| teams | Team[] | Los equipos que están participando en la batalla. |
| isTurnBased | boolean | Indica si la batalla es por turnos o basada en intervalos. |
| intervalCounter | number | Contador para las batallas basadas en intervalos de tiempo. |

## Methods

| Method | Arguments | Return | Description |
|---|---|---|---|
| constructor | `(teams: Team[], isTurnBased: boolean)` | `Battle` | Inicializa una nueva batalla. |
| fight | `(): void` | `void` | Lleva a cabo la batalla. |
| turnBasedCharacterFight | `(): void` | `void` | Realiza una batalla por turnos entre los personajes. |
| intervalBasedCharacterFight | `(): void` | `void` | Realiza una batalla basada en intervalos de tiempo. |
| validateConditions | `(): boolean` | `boolean` | Valida las condiciones antes de iniciar la batalla. |
| characterFight | `(isTurnBased: boolean): void` | `void` | Combina `turnBasedCharacterFight` y `intervalBasedCharacterFight` en una única función. |
| handleInterval | `(): Promise<void>` | `Promise<void>` | Espera un intervalo de tiempo. |
