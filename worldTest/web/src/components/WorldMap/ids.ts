/**
 * The map ids as constants plus their union types: the single source
 * of truth for region and country ids. Everywhere an id is used, the
 * compiler enforces one of these exact values (typos fail the build
 * instead of failing silently at runtime).
 */
export const REGION_IDS = {
    fergel_oeste: 'fergel_oeste',
    fergel_suroeste: 'fergel_suroeste',
    fergel_norte: 'fergel_norte',
    fergel_centro: 'fergel_centro',
    fergel_sureste: 'fergel_sureste',
    fergel_este: 'fergel_este',
    fergel_islas: 'fergel_islas',
    timbret_sureste: 'timbret_sureste',
    timbret_noreste: 'timbret_noreste',
    timbret_noroeste: 'timbret_noroeste',
    timbret_suroeste: 'timbret_suroeste',
} as const;

export type RegionId = typeof REGION_IDS[keyof typeof REGION_IDS];

export const COUNTRY_IDS = {
    fergel: 'fergel',
    timbret: 'timbret',
} as const;

export type CountryId = typeof COUNTRY_IDS[keyof typeof COUNTRY_IDS];
