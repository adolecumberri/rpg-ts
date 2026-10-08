import { CATEGORY_SECTIONS, Items } from '@core';
import type { ItemTableEntry } from '@core';
import { Icon } from '../components/UI/Icon';
import type { IconId } from '../components/UI/Icon';
import { highlightDefinition } from '../game/definitionText';

/**
 * The items dev page: every item of the global dictionary
 * (constants/items.ts), grouped by category, with its icon, name,
 * description and stat lines — the equipment catalog the game offers.
 */

// The display order of the category sections.
const CATEGORY_ORDER = [
    'weapon',
    'ranged_weapon',
    'magic_weapon',
    'armor',
    'equipment',
    'consumable',
    'quest',
    'key',
    'utility',
];

/** The compact stat line of an item: effects, elements, reach, kind,
 *  slots, bag bonus and prices. */
function statLine(entry: ItemTableEntry): string {
    const parts: string[] = [];
    for (const effect of entry.effects ?? []) {
        parts.push(`${effect.value > 0 ? '+' : ''}${effect.value} ${effect.stat}`);
    }
    for (const element of entry.elements ?? []) {
        parts.push(`${element.element} +${element.attackValue ?? 0}`);
    }
    if (entry.rangeOf) parts.push(`reach ${entry.rangeOf}`);
    if (entry.weaponType) parts.push(entry.weaponType);
    if (entry.arms) parts.push(entry.arms === 1 ? '1h' : '2h');
    if (entry.loadoutSlot) parts.push(entry.loadoutSlot);
    if (entry.bagSlots) parts.push(`+${entry.bagSlots} bag`);
    if (entry.buyValue !== undefined) parts.push(`buy ${entry.buyValue}`);
    if (entry.sellValue !== undefined) parts.push(`sell ${entry.sellValue}`);
    return parts.join(' · ');
}

export function ItemsScreen() {
    const entries = Object.values(Items) as ItemTableEntry[];
    const sections = CATEGORY_ORDER
        .map((category) => ({
            category,
            label: CATEGORY_SECTIONS[category as keyof typeof CATEGORY_SECTIONS] ?? category,
            rows: entries.filter((entry) => entry.category === category),
        }))
        .filter((section) => section.rows.length > 0);

    return (
        <div className="action-bar-demo pixel-font">
            <div className="action-bar-demo-content">
                {sections.map((section) => (
                    <div key={section.category} className="pixel-panel">
                        <div className="pixel-title">{section.label}</div>
                        {section.rows.map((entry) => (
                            <div key={entry.id} className="item-page-row">
                                <span className="item-page-icon" aria-hidden="true">
                                    <Icon id={(entry.icon ?? 'default') as IconId} size={4} />
                                </span>
                                <span className="item-page-info">
                                    <span className="item-page-name">{entry.name}</span>
                                    {entry.description ? (
                                        <span className="item-page-desc">
                                            {highlightDefinition(entry.description)}
                                        </span>
                                    ) : null}
                                    <span className="item-page-stats">{statLine(entry)}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
