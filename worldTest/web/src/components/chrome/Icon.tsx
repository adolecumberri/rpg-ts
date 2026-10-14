import type { CSSProperties } from 'react';
import { iconStyleOf } from '../../assets/icons';

export type { IconId } from '../../assets/icons';

/**
 * A pixel icon from the sheet dictionary: renders a 32x32 cell at any
 * size as a crisp background (no emoji overflow). Unknown ids fall
 * back to icons_4 (1,1), the default icon.
 */
export function Icon({
    id,
    size = 4, // UI Units
    title,
}: {
    id: string;
    size?: number;
    title?: string;
}) {
    const style: CSSProperties = iconStyleOf(id, size);
    return <span className="ui-icon" style={style} title={title} aria-hidden="true" />;
}
