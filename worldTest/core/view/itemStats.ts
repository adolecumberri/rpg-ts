import type { Item } from '../../../src';
import { DEFAULT_ELEMENTS } from '../damage/elements';

export type ItemStatLine = {
    icon: string;
    text: string;
};

const STAT_ICONS: Record<string, string> = {
    attack: '⚔️',
    defence: '🛡️',
    hp: '❤️',
    totalHp: '❤️',
};

/**
 * Human-readable stat lines for an item: stat effects plus elemental
 * attack/resistance values. Used by the shop and inventory views.
 */
export function itemStatsSummary(item: Item): ItemStatLine[] {
    const lines: ItemStatLine[] = [];

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
            lines.push({ icon, text: `+${element.attackValue} ${element.element} attack` });
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
