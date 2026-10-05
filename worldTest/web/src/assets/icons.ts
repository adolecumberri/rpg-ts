import type { CSSProperties } from 'react';
import icons1 from '../../../assets/icons/icons_1.jpg';
import icons2 from '../../../assets/icons/icons_2.jpg';
import icons3 from '../../../assets/icons/icons_3.jpg';
import icons4 from '../../../assets/icons/icons_4.jpg';
import icons5 from '../../../assets/icons/icons_5.jpg';

/**
 * The icon dictionary. Each sheet (icons_1..5) is 320x320 with a 10x10
 * grid of 32x32 icons. An icon is addressed by (sheet, row, col) with
 * 1-based row/col; the helper turns an id into a background style at
 * any render size, so emojis can be replaced by real pixel icons.
 */

export const ICON_SHEETS: Record<number, string> = {
    1: icons1,
    2: icons2,
    3: icons3,
    4: icons4,
    5: icons5,
};

export const ICON_SIZE = 32;
export const ICON_GRID = 10;

export type IconId =
    | 'atqFisico'
    | 'defence'
    | 'poderMagico'
    | 'defensaMagica'
    | 'speed'
    | 'critChance'
    | 'critMultiplier'
    | 'escudo'
    | 'casco'
    | 'espada'
    | 'arco'
    | 'vara'
    | 'armadura'
    | 'bota'
    | 'atras'
    | 'default';

type IconRef = { sheet: number; row: number; col: number };

// Content map: where each icon lives (1-based rows and cols).
export const ICONS: Record<IconId, IconRef> = {
    atqFisico: { sheet: 1, row: 6, col: 3 },
    defence: { sheet: 1, row: 3, col: 1 },
    poderMagico: { sheet: 1, row: 9, col: 1 },
    defensaMagica: { sheet: 1, row: 3, col: 10 },
    speed: { sheet: 4, row: 7, col: 1 },
    critChance: { sheet: 2, row: 2, col: 4 },
    critMultiplier: { sheet: 2, row: 2, col: 2 },

    escudo: { sheet: 1, row: 3, col: 7 },
    casco: { sheet: 1, row: 8, col: 3 },
    espada: { sheet: 3, row: 1, col: 1 },
    arco: { sheet: 3, row: 2, col: 1 },
    vara: { sheet: 3, row: 3, col: 1 },
    armadura: { sheet: 3, row: 4, col: 1 },
    bota: { sheet: 3, row: 8, col: 1 },

    // The back/close X: icons_4 (5,1).
    atras: { sheet: 4, row: 5, col: 1 },

    // icons_4 (1,1): the fallback for unknown ids.
    default: { sheet: 4, row: 1, col: 1 },
};

/** The background style that renders one icon at the given UI-unit
 *  size (1u = 4px; the default 4u = 16px). The math rides calc() over
 *  --u so the icon scales with the design ladder. */
export function iconStyleOf(id: string, sizeUIU: number = 4): CSSProperties {
    const ref = ICONS[id as IconId] ?? ICONS.default;
    const sheet = ICON_SHEETS[ref.sheet];
    const span = sizeUIU * ICON_GRID;
    return {
        width: `calc(var(--u) * ${sizeUIU})`,
        height: `calc(var(--u) * ${sizeUIU})`,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `calc(var(--u) * ${span}) calc(var(--u) * ${span})`,
        backgroundPosition: `calc(var(--u) * ${-(ref.col - 1) * sizeUIU}) calc(var(--u) * ${-(ref.row - 1) * sizeUIU})`,
        backgroundRepeat: 'no-repeat',
    };
}
