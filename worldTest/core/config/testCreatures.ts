// Fixed values for the test creatures of the elemental fight and the
// custom-XP creature in Central Town.
export const SAGE_SPIRIT = {
    id: 'sage_spirit',
    name: 'Sage Spirit',
    hp: 20,
    totalHp: 20,
    attack: 0,
    defence: 0,
    talk: '"I hold 100 XP for the one who defeats me."',
    customXp: 100,
};

export const FIRE_GOLEM = {
    id: 'fire_golem',
    name: 'Fire Golem',
    hp: 60,
    totalHp: 60,
    attack: 6,
    defence: 2,
    // 2x resistance to fire: fire damage is halved.
    fireMultiplier: 0.5,
};

export const ICE_WRAITH = {
    id: 'ice_wraith',
    name: 'Ice Wraith',
    hp: 40,
    totalHp: 40,
    attack: 5,
    defence: 1,
    // 2x weakness to fire: fire damage is doubled.
    fireMultiplier: 2,
};
