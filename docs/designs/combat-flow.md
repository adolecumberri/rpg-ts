# Combat Flow — how a fight resolves today

* **Author:** Lead (system map requested by the owner)
* **Date:** 2026-11-04
* **Engine:** `worldTest/core/combat/hybridCombat.ts` (the real battles;
  `src/classes/Combat/IntervalCombat.ts` is the legacy library engine, only
  reached through `worldTest/core/config/intervalBattle.ts`).

## 1. The big picture

```mermaid
flowchart TD
    A[CombatScreen builds the fight\nbuildHybridCombat] --> B[HybridCombat constructor]
    B --> B1[Set intervals\nSet starting mana]
    B1 --> B2[Apply passive statusOnSelf\n(statuses set their stat modifiers)]
    B2 --> B3[syncAuras: team aura effects]
    B3 --> B4[syncCrew: Crew X attack statuses]
    B4 --> C{Round scheduler\n(next() or resolveAction)}
    C --> D[Act once for the due fighter]
    D --> D0[Turn start: on_turn statuses tick]
    D0 --> D1{Fainted?}
    D1 -->|yes| D
    D1 -->|no| D2{Stunned?}
    D2 -->|yes| D
    D2 -->|no| D3[Mana regen]
    D3 --> E{Manual fighter?}
    E -->|yes| F[Manual prompt:\nattack or skill target]
    E -->|no| G[Auto planner:\nskills first, else attack]
    F --> H[performAttack / performSkill]
    G --> H
    H --> I[Damage + statuses mutate the targets]
    I --> J[Trigger after_attack / after_turn\non involved characters]
    J --> K[Deaths, auras and Crew resync]
    K --> L{Side wiped?}
    L -->|no| C
    L -->|yes| M[dispose: clear statuses (keep persistent)\nrestore disarmed weapons]
    M --> N[finishCombat: rewards, missions, safety status clear]
```

Two drivers exist: the production screen calls `resolveAction(actorId)` one
action at a time; the dev screens and auto battles call `next()` (tick based).
Both share `actOnce`.

## 2. Where every number comes from (and when)

| Source | When it is applied | Where |
|---|---|---|
| Base stats + level growth | Character creation and level-ups, outside battle | `config/growth.ts`, character generator |
| Job stat bonuses | When a job is assigned/removed (job change), outside battle | `applyJobBonuses` / `removeJobBonuses` |
| Item stats | When an item is equipped/unequipped, before battle | EquipmentManager / loadout |
| Passive battle-start statuses | **Battle start**, after combatants exist | `HybridCombat` constructor |
| X-mastery passives (Knife Mastery) | **Battle start**, only when the required weapon type is in any equipped hole; then a permanent battle status | `HybridCombat` constructor |
| Aura statuses | Battle start and after every action | `syncAuras` |
| Crew X attack bonus | Battle start and after every action (rebuilt when the count changes) | `syncCrew` |
| Weapon-class bonus (+20% knives) | During each basic attack | `general.ts` (`weaponDamageBonus` statuses) |
| Impact procs (passive) | During each basic attack's impact phase | `impact.ts` |
| Reactions (passive) | When the bearer is attacked | `damage/reactions.ts` |
| Skill statuses (Silence-like) | When the skill resolves / at battle start | `skillEffects.ts`, statuses |

Passives are collected from the character's available skills (own kit + held
job ladder + second-slot job ladder + tree). A passive can arrive as a
battle-start status (`statusOnSelf`), an impact proc, a reaction, a crew config,
or a weapon-damage bonus status.

## 3. One action, step by step

### Basic attack (`performAttack`)

1. Target: manual player pick, or auto planner's taunt-weighted pick.
2. `generalAttackResolver`:
   1. base components from `attackComponentsOf` (weapon/attack stats);
   2. every equipped item's `onAttack` hook;
   3. weapon-class bonus statuses (knife +20% when any equipped hole has that
      weapon type);
   4. impact phase: impact hits (Sheen, Phantom, Guinsoo), item `impactBonus`,
      and impact procs from passives/items;
   5. component merge;
   6. accuracy roll (skipped for counters), evasion roll;
   7. **crit roll**: per physical component only;
   8. kind mitigation: defence (physical), magicDefence (magical), none (true),
      then elemental affinities/resistances;
   9. defender reactions (parry/cover/counter) — the first triggered wins;
   10. `onHit` item hooks on real damage;
   11. hp mutation, death flags.
3. `after_attack` and `after_turn` status moments fire on attacker and target.
4. Auras and Crew are resynced; deaths may end the battle.

### Skill (`performSkill`)

1. Mana cost and hp cost are paid.
2. Targets: player picks (manual) or the planner's policy (auto).
3. `resolveSkillEffect` per target:
   1. damage from `damageFor`/`damage`, **crit-free**, mitigated by kind;
   2. Cover redirect (the coverer takes it through its own mitigation);
   3. heal (static or `healFor`);
   4. dispel (side-aware: enemies lose positive statuses, allies negative);
   5. statuses on targets (`statusOnTargets`/`statusesOnTargets`) — Astra
      refuses negative ones;
   6. cover applied to an ally;
   7. caster status (`statusOnSelf`);
   8. fatigue changes.
4. Weapon Disarm (if the skill has `disarmWeapon`) detaches the target's
   weapon after the effect.
5. Same status moments + aura/crew resync as an attack.

## 4. What can crit, and what cannot

| Thing | Can crit? | Why |
|---|---|---|
| Basic attack — physical components | Yes, per component | `rollCrits`: only `kind === PHYSICAL` |
| Basic attack — magical components | No | `rollCrits` skips non-physical |
| Basic attack — true components | No | same |
| Counter-attacks (physical) | Yes | the same resolver runs with `isCounter`; they can also miss and be evaded like any attack |
| Skill damage | No | `resolveSkillEffect` has no crit step |
| Status damage (`onTrigger`, burn, etc.) | No | direct hp changes |
| Weapon-class bonus (+20%) | It multiplies before crit, so a crit multiplies the boosted value | order in the resolver |

Accuracy/evasion rolls are skipped for counter-attacks; they always land.

## 5. Damage types vs elements

- **Kinds:** `physical`, `magical`, `true`.
- **Physical elements:** `physical`, `pierce`, `blunt`. "Blunt" is a physical
  element, not a separate kind (Shield Bash uses it).
- **Magical elements:** `arcane`, `fire`, `ice`; unknown elements default to
  magical.
- True damage ignores defence, resistances and affinities.

## 6. Taunt and target choice

- `taunt` is a real stat (`character.getStat('taunt')`), multiplied by the
  formation row (`positionTauntVariation`).
- Auto target picking (attacks and skill planning) weights defenders by
  taunt / sum(taunt); multi-target picks sample distinct defenders by weight.
- Manual target picking ignores taunt: the player chooses any valid enemy.

## 7. Deprecated, broken or duplicated parts (found while mapping)

1. **Legacy `IntervalCombat`** (`src/classes/Combat/`) is not used by the app's
   battles; it survives through `worldTest/core/config/intervalBattle.ts` and
   the dev tools. It has no mana, passives, auras or teardown.
2. **Status clock parity (partial)**: `HybridCombat` now fires `on_turn` at the
   start of the bearer's action, so statuses written for that moment tick and
   expire like they do in `IntervalCombat`. It still fires `after_attack` and
   `after_turn`; the two engines do not yet share one moment table, and the
   legacy engine has no mana/passives/teardown.
3. **Stun is dead**: `stunStatus` is `after_turn`/ONCE/duration 1 and is cleaned
   in the same trigger pass before `consumeStunTurn` reads it — Shield Bash's
   stun does nothing.
4. **Two Disarms**: the old `disarm` skill is now displayed as **Hand Hit**
   (attack −40%, status name "Hand Hit"); `disarm_weapon` is the real unequip.
5. **Skills never run the attack pipeline**: weapon `onAttack`, impact procs,
   crit, and the knife `weaponDamageBonus` apply only to basic attacks.
   A "normal attack on X targets" is feasible as a multi-target skill routed
   through the attack resolver per target (a small engine addition), not as a
   skill `damageFor`.
6. **`turns` vs internal duration**: status chip text displays the raw duration;
   the engine ticks decrement it once per matching trigger.
7. **`JobSkillPlan.passive` is unread**; passive-ness comes from the spec only.
8. **Manual multi-target skills are not validated by side/distinctness** in
   `resolveManualSkill`; the UI normally prevents it, the engine does not.
9. **`clearStatuses` / teardown** used to have no production caller; this branch
   added `dispose()` and the `finishCombat` safety net, but the legacy engine
   still has no equivalent.

## 8. Open questions for the combat-process brainstorm

- Unify the status clock (one moment list, both engines) and decide which
  existing statuses move to `after_turn`.
- One damage pipeline for skills and attacks (so crit/on-hit/impact can be
  opted into per skill), or keep them separate by design.
- DoT/periodic effects: a real per-turn effect owner (needed for Escorbuto's
  DoT version and channels).
- Whether taunt should matter for manual targeting (currently it does not).
- Retire `IntervalCombat` or bring it to parity (mana, passives, teardown).
