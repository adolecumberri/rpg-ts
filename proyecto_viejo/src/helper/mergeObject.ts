import { Stats } from '../interfaces';

export function mergeObjects(data: any[]) {
  const result: {[x: string]: any} = {};

  data.forEach((basket) => {
    for (const [key, value] of Object.entries(basket)) {
      if (result[key]) {
        result[key] += value;
      } else {
        result[key] = value;
      }
    }
  });
  return result;
}

// wirtte function that will merge 2 objects of type stats
//

// write function that will merge 2 objects of type stats
export function mergeStats(...stats: Stats[]) {
  const result: Stats = {
    hp: 0,
    total_hp: 0,
    mp: 0,
    total_mp: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    luck: 0,
    accuracy: 0,
    attack: 0,
    attack_interval: 0,
    attack_speed: 0,
    crit: 0,
    crit_multiplier: 0,
    defence: 0,
    evasion: 0,
    mana_regen: 0,
    hp_regen: 0,
    min_damage_dealt: 0,
    max_damage_dealt: 0,
    mana: 0,
  };

  stats.forEach((basket) => {
    for (const [key, value] of Object.entries(basket)) {
      if (result[key as keyof Stats]) {
        result[key as keyof Stats] += value;
      } else {
        result[key as keyof Stats] = value;
      }
    }
  });
  return result;
}

