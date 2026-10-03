# Map images (countries + regions)

One image per country and one per region, named by the engine ID (never
by the display name — the in-game names can change without touching the
files).

## File names

Country files: `<country_id>.webp` — `fergel.webp`, `timbret.webp`
Region files:  `<region_id>.webp` — `fergel_oeste.webp`, `timbret_suroeste.webp`, ...

All 11 region ids:

    fergel_oeste   fergel_suroeste   fergel_norte    fergel_centro
    fergel_sureste fergel_este       fergel_islas
    timbret_sureste timbret_noreste  timbret_noroeste timbret_suroeste

## Wiring

In `worldTest/web/src/components/WorldMap/countries.ts`:

```ts
import fergelImg from '../../../../assets/maps/icons/fergel.webp';

// in the fergel entry:
image: { src: fergelImg },
```

In `worldTest/web/src/components/WorldMap/regions.ts`:

```ts
import fergelOesteImg from '../../../../assets/maps/icons/fergel_oeste.webp';

// in the fergel_oeste entry:
image: { src: fergelOesteImg },
```

## Placement

- The image renders at its NATURAL size (export at the size you want on
  the map, no scaling), centered on the entity's `position`
  (the measured center of its mask bounding box).
- Country images show on the countries band (always visible).
- Region images show on the regions/details bands, only while the
  region is discovered.
- Dev panel toggle: `iconos`.
