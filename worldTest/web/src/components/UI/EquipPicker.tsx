import type { ReactNode } from 'react';
import type { EquipmentSection } from '@core';
import { Icon } from './Icon';

// The equipment sections in tab order (the picker shows one at a time).
export const ALL_SECTIONS: EquipmentSection[] = [
    'espadas',
    'varas',
    'arcos',
    'cascos',
    'ropa',
    'escudos',
    'accesorios',
];

export const SECTION_META: Record<EquipmentSection, { label: string; icon: string }> = {
    espadas: { label: 'Armas de filo', icon: 'espada' },
    varas: { label: 'Armas contundentes', icon: 'vara' },
    arcos: { label: 'Armas arrojadizas', icon: 'arco' },
    cascos: { label: 'Protección cabeza', icon: 'casco' },
    ropa: { label: 'Protección torso', icon: 'armadura' },
    escudos: { label: 'Escudos', icon: 'escudo' },
    accesorios: { label: 'Accesorios', icon: 'default' },
};

/**
 * The equip-picker panel (stitch view 1): the header with the section
 * tabs, the scrolled item table (nombre / en uso / total) and the
 * optional fixed action strip. The team page's equipment flow renders
 * it with the Equip/Unequip actions; the informative inventory page
 * renders it without any.
 */
export function EquipPicker<Section extends string>({
    title,
    sections,
    sectionMeta,
    activeSection,
    onSectionChange,
    emptyText,
    rows,
    actions,
}: {
    title: string;
    sections: readonly Section[];
    sectionMeta: Record<Section, { label: string; icon: string }>;
    activeSection: Section;
    onSectionChange: (section: Section) => void;
    // Shown instead of the table when the active section has no rows.
    emptyText: string;
    // The item rows of the active section (the table head is fixed).
    rows: ReactNode[];
    // The fixed strip under the table (Equip/Unequip) — omitted when
    // the picker is purely informative.
    actions?: ReactNode;
}) {
    return (
        <div className="equip-picker">
            <div className="pixel-modal-header">
                <span className="pixel-modal-title">{title}</span>
                <div className="inv-tabs">
                    {sections.map((section) => {
                        const meta = sectionMeta[section];
                        return (
                            <button
                                key={section}
                                type="button"
                                title={meta.label}
                                aria-label={meta.label}
                                className={`inv-tab pixel-btn${activeSection === section ? ' pixel-btn--primary' : ''}`}
                                onClick={() => onSectionChange(section)}
                            >
                                <Icon id={meta.icon} size={4} />
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="pixel-modal-body">
                {rows.length === 0 ? (
                    <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)' }}>{emptyText}</div>
                ) : (
                    <div>
                        <div className="inv-table-head">
                            <span className="inv-head-spacer" />
                            <span className="inv-head-name">nombre</span>
                            <span className="inv-head-count">en uso</span>
                            <span className="inv-head-count">total</span>
                        </div>
                        {rows}
                    </div>
                )}
            </div>
            {actions ? <div className="equip-actions">{actions}</div> : null}
        </div>
    );
}
