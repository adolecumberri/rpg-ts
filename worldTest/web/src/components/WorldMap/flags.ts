/**
 * Feature flags for the world map. A disabled country disappears from
 * the map COMPLETELY (no art, no fog, no hover/selection, no
 * discovery, not even hit-testing) while its data stays untouched in
 * countries.ts / regions.ts for the future. Re-enabling is flipping
 * the boolean back to true.
 */
export const COUNTRY_ENABLED: Record<string, boolean> = {
    fergel: true,
    // The current art (mapa.webp) only covers Fergel; re-enable when
    // the Timbret art arrives.
    timbret: false,
};
