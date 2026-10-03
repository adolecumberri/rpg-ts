# Cloud sprites

One cloud sprite per region (optional). When a region defines `cloud`
in `worldTest/web/src/components/WorldMap/regions.ts`, the world map
switches to cloud mode:

- The sprite is the FOG while the region is undiscovered (the square
  mask tiles are then only used for hit-testing).
- Hover and selection tint the sprite's silhouette, so the highlight
  always matches the cloud shape.
- The countries band never shows fog (the whole world is visible).

## How to make a sprite

1. Open your big cloud image (1696 x 2032) in the editor.
2. Select ONE cloud exactly (with a few transparent pixels of margin).
3. Copy the selection to a new document WITHOUT resizing (1:1).
4. Export as `.webp` (or PNG) with transparency, named `<region>.webp`,
   into this folder, e.g. `fergel_oeste.webp`.
5. In `regions.ts` add to that region:

   ```ts
   import fergelOesteCloud from '../../../../assets/maps/clouds/fergel_oeste.webp';

   cloud: { src: fergelOesteCloud, x: 618, y: 1434 },
   ```

   `x` / `y` = the sprite's top-left corner in the 1696 x 2032 map
   space (the same offsets where the cloud sat in the big image).
   No full-width images needed: the world container is the relative
   container and the sprite is placed absolutely at its native size.

## Measured region boxes (1696 x 2032 mask) as a slicing reference

- fergel_oeste:    624,1440 .. 863,1743
- fergel_suroeste: 816,1632 .. 1151,1887
- fergel_norte:    800,1376 .. 1391,1647
- fergel_centro:   976,1520 .. 1119,1647
- fergel_sureste:  1104,1552 .. 1295,1743
- fergel_este:     1248,1440 .. 1519,1823
- fergel_islas:    1136,1680 .. 1279,1855
- timbret_sureste: 480,1520 .. 719,1743
- timbret_noreste: 448,1312 .. 687,1551
- timbret_noroeste: 208,1264 .. 527,1583
- timbret_suroeste: 208,1504 .. 671,1871
