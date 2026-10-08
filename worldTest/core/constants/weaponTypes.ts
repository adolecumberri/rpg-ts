// The weapon triangle dictionary (the Job's WeaponType): swords, bows
// and staves. Content references weapon types only through these
// constants (WEAPON_TYPES.sword).

export const WEAPON_TYPES = {
    sword: 'sword',
    bow: 'bow',
    staff: 'staff',
} as const;

export type WeaponTypeId = typeof WEAPON_TYPES[keyof typeof WEAPON_TYPES];
