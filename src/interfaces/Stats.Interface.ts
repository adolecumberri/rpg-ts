interface Stats {
    accuracy?: number;
    attack?: number;
    attack_interval?: number;
    attack_speed?: number;
    crit?: number;
    crit_multiplier?: number;
    total_hp?: number;
    defence?: number;
    evasion?: number;
    hp?: number;
    [x: string]: any;
}

export { Stats };
