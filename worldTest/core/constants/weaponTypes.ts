// The weapon triangle dictionary (the Job's WeaponType): swords, bows,
// staves and knives. Content references weapon types only through these
// constants (WEAPON_TYPES.sword).

export const WEAPON_TYPES = {
    sword: 'sword',
    bow: 'bow',
    staff: 'staff',
    knife: 'knife',
} as const;

export type WeaponTypeId = typeof WEAPON_TYPES[keyof typeof WEAPON_TYPES];
