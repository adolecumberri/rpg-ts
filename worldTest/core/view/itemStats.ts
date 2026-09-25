import type { Item } from '../../../src';
import { DEFAULT_ELEMENTS } from '../damage/elements';
import { kindOfElement } from '../config/damage';

export type ItemStatLine = {
    icon: string;
    text: string;
};

const STAT_ICONS: Record<string, string> = {
    attack: '⚔️',
    defence: '🛡️',
    magicDefence: '🔮',
    critChance: '🎯',
    critMultiplier: '💥',
    hp: '❤️',
    totalHp: '❤️',
};

const KIND_SUFFIX: Record<string, string> = {
    physical: '',
    magical: ' (magical)',
    true: ' (true)',
};

/**
 * Human-readable stat lines for an item: stat effects plus elemental
 * attack/resistance values, with the damage kind of each elemental
 * attack. Used by the shop and inventory views.
 */
export function itemStatsSummary(item: Item): ItemStatLine[] {
    const lines: ItemStatLine[] = [];

    if (item.definition.bagSlots) {
        lines.push({ icon: '🎒', text: `+${item.definition.bagSlots} inventory slots` });
    }

    for (const effect of item.definition.effects ?? []) {
        const isDebuff = effect.typeOfModification.includes('DEBUFF');
        const isPercentage = effect.typeOfModification.includes('PERCENTAGE');
        lines.push({
            icon: STAT_ICONS[effect.stat] ?? '📊',
            text: `${isDebuff ? '-' : '+'}${effect.value}${isPercentage ? '%' : ''} ${effect.stat}`,
        });
    }

    for (const element of item.definition.elements ?? []) {
        const icon = DEFAULT_ELEMENTS.get(element.element)?.icon ?? '✨';
        if (element.convertsAttack) {
            lines.push({
                icon,
                text: `converts attack to ${element.element}${element.attackValue ? ` (+${element.attackValue})` : ''}`,
            });
        } else if (element.attackValue) {
            const kind = kindOfElement(element.element);
            const text = element.element === 'true'
                ? `deals ${element.attackValue} true damage`
                : `+${element.attackValue} ${element.element} attack${KIND_SUFFIX[kind] ?? ''}`;
            lines.push({ icon, text });
        }
        if (element.resistanceValue) {
            lines.push({ icon, text: `resist ${element.resistanceValue} ${element.element}` });
        }
    }

    return lines;
}

export function itemStatsText(item: Item): string {
    return itemStatsSummary(item)
        .map((line) => `${line.icon} ${line.text}`)
        .join(' · ');
}

/**
 * Full item description for detail views: the written flavour first,
 * then the generated stat lines.
 */
export function itemDescriptionText(item: Item): string {
    const stats = itemStatsText(item);
    const flavour = item.description ?? '';
    return [flavour, stats].filter(Boolean).join('\n');
}
