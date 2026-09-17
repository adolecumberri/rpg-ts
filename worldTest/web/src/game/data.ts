import { Character, Experience, Item, Stats, Team } from '@rpg';
import type { Skill, SkillEffect, EffectTargeting } from '@rpg/classes/Skills';
import type { CombatContext } from '@rpg/classes/Combat/Combat.interfaces';
import { TargetSubsetResolver } from '@rpg/classes/Combat/TargetSubsetResolver';
import type { DamagePacket } from '@rpg/classes/Combat/DamagePacket';
import type { NPC, Place, ShopEntry } from './types';

// ---------------------------------------------------------------------------
// Combat effects (mirrors worldTest/Combat/Effects/DamageEffect.ts)
// ---------------------------------------------------------------------------
class DamageEffect implements SkillEffect {
    constructor(
        public amount: number,
        public type: DamagePacket['type'],
        public targeting: EffectTargeting = 'ALL',
        public amountOfTargets = 1,
    ) {}

    execute(context: CombatContext): void {
        const selected = TargetSubsetResolver.resolve(
            context.targetEffects,
            context.attacker,
            this.targeting,
            this.amountOfTargets,
        );
        for (const targetEffect of selected) {
            targetEffect.damagePackets.push({ amount: this.amount, type: this.type });
        }
    }
}

export const SKILLS: Record<string, Skill> = {
    basicAttack: {
        id: 'basic_attack',
        name: 'Basic Attack',
        description: 'Strike a single enemy.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        effects: [new DamageEffect(12, 'physical')],
    },
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        description: 'Burn every enemy.',
        targeting: 'ALL_ENEMIES',
        effects: [new DamageEffect(40, 'fire')],
    },
    groupHeal: {
        id: 'group_heal',
        name: 'Regenerate',
        description: 'Heal the whole party.',
        targeting: 'ALL_ALLIES',
        effects: [new DamageEffect(15, 'heal')],
    },
};

export function makeAttackSkill(amount: number): Skill {
    return {
        id: 'attack',
        name: 'Attack',
        description: 'A basic physical strike.',
        targeting: 'ENEMY',
        numberOfTargets: 1,
        effects: [new DamageEffect(amount, 'physical')],
    };
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
export function makeSword(): Item {
    return new Item({
        id: 'rusty_sword',
        name: 'Rusty Sword',
        category: 'equipment',
        slot: 'weapon',
        description: 'An old but serviceable blade.',
        buyValue: 50,
        sellValue: 25,
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 }],
    });
}

export function makeShield(): Item {
    return new Item({
        id: 'wooden_shield',
        name: 'Wooden Shield',
        category: 'equipment',
        slot: 'armor',
        description: 'Basic wooden protection.',
        buyValue: 40,
        sellValue: 20,
        effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 5 }],
    });
}

export function makeRing(): Item {
    return new Item({
        id: 'cursed_ring',
        name: 'Cursed Ring',
        category: 'equipment',
        slot: 'accessory',
        description: 'Power at a price.',
        buyValue: 40,
        sellValue: 32,
        effects: [
            { stat: 'attack', typeOfModification: 'BUFF_PERCENTAGE', value: 20 },
            { stat: 'hp', typeOfModification: 'DEBUFF_PERCENTAGE', value: 30 },
        ],
    });
}

export function makePotion(): Item {
    return new Item({
        id: 'health_potion',
        name: 'Health Potion',
        category: 'consumable',
        description: 'Restores 30 HP.',
        buyValue: 10,
        sellValue: 5,
        onUse: (_self, target) => {
            target.stats.hp = Math.min(target.stats.totalHp, target.stats.hp + 30);
            target.stats.isAlive = target.stats.hp > 0 ? 1 : 0;
            return true;
        },
    });
}

export const SHOP_ENTRIES: ShopEntry[] = [
    { item: makePotion(), buyPrice: 10, sellPrice: 5 },
    { item: makeSword(), buyPrice: 50, sellPrice: 25 },
    { item: makeShield(), buyPrice: 40, sellPrice: 20 },
];

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------
export const PLACES: Place[] = [
    {
        id: 'central_town',
        name: 'Central Town',
        emoji: '🏰',
        description: 'The bustling heart of the land. An inn, a shop, and rumors of goblins to the east.',
        actions: [
            { id: 'shop', label: 'Visit the Shop', kind: 'shop', icon: '🛒' },
            { id: 'rest', label: 'Rest at the Inn', kind: 'rest', icon: '🛏️' },
            { id: 'gossip', label: 'Gossip with locals', kind: 'message', icon: '🗣️', message: '"Goblins have been seen near the Whispering Forest…"' },
        ],
        connections: [
            { label: 'Whispering Forest', to: 'forest', icon: '🌲' },
            { label: 'North Town', to: 'north_town', icon: '🏘️' },
            { label: 'South Town', to: 'south_town', icon: '🏘️' },
            { label: 'East Town', to: 'east_town', icon: '🌅', requiredFlag: 'east_unlocked', lockedMessage: 'The east road is closed until you unite the villages.' },
        ],
    },
    {
        id: 'forest',
        name: 'Whispering Forest',
        emoji: '🌲',
        description: 'Ancient trees whisper secrets. A goblin camp hides among the roots.',
        actions: [
            { id: 'fight_goblin', label: 'Ambush the Goblin', kind: 'fight', npcId: 'goblin', icon: '⚔️' },
        ],
        connections: [
            { label: 'Central Town', to: 'central_town', icon: '🏰' },
            { label: 'Misty Cave', to: 'cave', icon: '🕳️' },
        ],
    },
    {
        id: 'cave',
        name: 'Misty Cave',
        emoji: '🕳️',
        description: 'A dark, echoing cave. Something glitters in the back.',
        actions: [
            { id: 'explore', label: 'Search for treasure', kind: 'message', icon: '💎', gold: 15, message: 'You found 15 gold pieces in the cave!' },
            { id: 'cave_fight', label: 'Fight the Cave Troll', kind: 'fight', npcId: 'troll', icon: '⚔️' },
        ],
        connections: [{ label: 'Whispering Forest', to: 'forest', icon: '🌲' }],
    },
    {
        id: 'north_town',
        name: 'North Town',
        emoji: '🏘️',
        description: 'A quiet village. A wary resident watches you approach.',
        actions: [],
        connections: [{ label: 'Central Town', to: 'central_town', icon: '🏰' }],
    },
    {
        id: 'south_town',
        name: 'South Town',
        emoji: '🏘️',
        description: 'A peaceful village by the river.',
        actions: [],
        connections: [{ label: 'Central Town', to: 'central_town', icon: '🏰' }],
    },
    {
        id: 'east_town',
        name: 'East Town',
        emoji: '🌅',
        description: 'A mysterious town that opens only to those who unite the villages.',
        actions: [
            { id: 'east_treasure', label: 'Claim the reward', kind: 'message', icon: '🏆', gold: 100, message: 'You are rewarded for uniting the realm!' },
        ],
        connections: [{ label: 'Central Town', to: 'central_town', icon: '🏰' }],
    },
];

export const PLACES_BY_ID: Record<string, Place> = Object.fromEntries(
    PLACES.map((place) => [place.id, place]),
);

// ---------------------------------------------------------------------------
// Characters / NPCs / starting world
// ---------------------------------------------------------------------------
function makeHero(): Character {
    const hero = new Character({
        id: 'hero',
        name: 'Hero',
        stats: new Stats({ hp: 50, totalHp: 100, attack: 10, defence: 5 }),
        experience: new Experience({ growthFunction: ({ level }) => level * 50 }),
        skills: [SKILLS.fireball, SKILLS.groupHeal],
    });
    hero.experience.onLevelUpHandler = () => {
        hero.stats.attack += 2;
        hero.stats.defence += 1;
        hero.stats.totalHp += 10;
        hero.stats.hp = hero.stats.totalHp;
    };
    return hero;
}

function makeCompanion(): Character {
    return new Character({
        id: 'companion',
        name: 'Companion',
        stats: new Stats({ hp: 40, totalHp: 80, attack: 8, defence: 4 }),
        skills: [],
    });
}

function makeNPC(id: string, name: string, stats: { hp: number; totalHp: number; attack: number; defence: number }, opts: Partial<NPC> = {}): NPC {
    const character = new Character({ id, name, stats: new Stats(stats) });
    return {
        id,
        character,
        talk: opts.talk ?? '…',
        xpReward: opts.xpReward ?? 10,
        goldReward: opts.goldReward ?? 5,
        recruitOnDefeat: opts.recruitOnDefeat,
    };
}

export function createInitialWorld(): { team: Team; npcs: Map<string, NPC[]> } {
    const team = new Team();
    team.addCharacter(makeHero());
    team.addCharacter(makeCompanion());
    team.inventory.addItem(makeSword());
    team.inventory.addItem(makeShield());
    team.inventory.addItem(makePotion(), 3);
    team.inventory.addItem(makeRing());
    team.gold = 20;

    const npcs = new Map<string, NPC[]>();
    npcs.set('central_town', [
        makeNPC('wanderer', 'Wandering Fighter', { hp: 25, totalHp: 25, attack: 7, defence: 1 }, {
            talk: '"Looking for a friendly spar?"',
            xpReward: 20,
            goldReward: 8,
        }),
    ]);
    npcs.set('forest', [
        makeNPC('goblin', 'Goblin', { hp: 30, totalHp: 30, attack: 6, defence: 0 }, {
            talk: '"Grrr… shiny! Mine!"',
            xpReward: 25,
            goldReward: 12,
        }),
    ]);
    npcs.set('cave', [
        makeNPC('troll', 'Cave Troll', { hp: 50, totalHp: 50, attack: 9, defence: 1 }, {
            talk: '"Who dares enter my cave?"',
            xpReward: 40,
            goldReward: 20,
        }),
    ]);
    npcs.set('north_town', [
        makeNPC('north_resident', 'Aren', { hp: 20, totalHp: 20, attack: 5, defence: 1 }, {
            talk: '"I don\'t trust strangers."',
            xpReward: 15,
            goldReward: 6,
            recruitOnDefeat: true,
        }),
    ]);
    npcs.set('south_town', [
        makeNPC('south_resident', 'Mira', { hp: 20, totalHp: 20, attack: 5, defence: 1 }, {
            talk: '"The south is peaceful… for now."',
            xpReward: 15,
            goldReward: 6,
            recruitOnDefeat: true,
        }),
    ]);

    return { team, npcs };
}

export function makeGroupTeam(): Team {
    const members = Array.from({ length: 3 }, (_, i) =>
        new Character({
            id: `bandit_${i}`,
            name: `Bandit ${i + 1}`,
            stats: new Stats({ hp: 14, totalHp: 14, attack: 5, defence: 0 }),
        }),
    );
    return new Team({ id: 'bandits', members });
}
