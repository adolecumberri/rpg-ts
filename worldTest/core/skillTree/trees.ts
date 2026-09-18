import { SkillTree } from './skillTree';
import {
    ItemCondition,
    LevelCondition,
    PreviousNodeCondition,
    QuestFlagCondition,
    StatCondition,
} from './conditions';

// Factories: every session gets fresh tree instances so the learned
// state never leaks between sessions or characters.
export function createHeroTree(): SkillTree {
    return new SkillTree([
        {
            id: 'warcry',
            name: 'Warcry',
            description: 'Unlocks the Warcry skill (buff self, weaken enemy).',
            skillId: 'warcry',
            conditions: [new LevelCondition(2)],
        },
        {
            id: 'chain_bolt',
            name: 'Chain Bolt',
            description: 'Unlocks the Chain Bolt skill (up to 4 targets).',
            skillId: 'chain_bolt',
            conditions: [new LevelCondition(2), new PreviousNodeCondition('warcry')],
        },
        {
            id: 'stone_skin',
            name: 'Stone Skin',
            description: 'Unlocks the Stone Skin skill (defence up).',
            skillId: 'stone_skin',
            conditions: [new StatCondition('defence', 6)],
        },
        {
            id: 'blade_dance',
            name: 'Blade Dance',
            description: 'Unlocks the Blade Dance skill (slices up to 3 enemies).',
            skillId: 'blade_dance',
            conditions: [new LevelCondition(4), new ItemCondition('rusty_sword')],
        },
        {
            id: 'veteran',
            name: 'Veteran',
            description: 'Permanent +5 ATK and +10 max HP.',
            statBonuses: [
                { stat: 'attack', value: 5 },
                { stat: 'totalHp', value: 10 },
            ],
            conditions: [new QuestFlagCondition('east_unlocked')],
        },
    ]);
}

export function createCompanionTree(): SkillTree {
    return new SkillTree([
        {
            id: 'fireball',
            name: 'Fireball',
            description: 'Unlocks the Fireball skill.',
            skillId: 'fireball',
            conditions: [new LevelCondition(3)],
        },
    ]);
}
