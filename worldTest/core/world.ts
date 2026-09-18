import { Character, Stats, Team } from '../../src';
import { makeCursedRing, makeFireSword, makeHealthPotion, makeRustySword, makeWoodenShield } from './items';
import { buildCompanion, buildEmber, buildHero } from './config/characters';
import { DropTable } from './loot/dropTable';
import { equipToCharacter } from './inventory';
import { setAffinity } from './damage/affinities';
import { FIRE_GOLEM, ICE_WRAITH, SAGE_SPIRIT } from './config/testCreatures';
import type { NPC, Place } from './types';

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
            { label: 'Training Grounds', to: 'training', icon: '🥊' },
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
        id: 'training',
        name: 'Training Grounds',
        emoji: '🥊',
        description: 'A sparring yard. Perfect for testing tactics, statuses and passing turns.',
        actions: [
            { id: 'fight_dummy', label: 'Fight the Practice Dummy', kind: 'fight', npcId: 'dummy', icon: '🎯' },
            { id: 'fight_tank', label: 'Fight the Iron Golem', kind: 'fight', npcId: 'iron_golem', icon: '🗿' },
            { id: 'fight_group', label: 'Fight the Bandit Gang', kind: 'fight_group', icon: '⚔️' },
            { id: 'fight_elemental', label: 'Elemental Test (2 monsters)', kind: 'fight_group', groupId: 'elemental', icon: '🔥' },
        ],
        connections: [{ label: 'Central Town', to: 'central_town', icon: '🏰' }],
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

export const PLACES_BY_ID: Record<string, Place> = PLACES.reduce((acc: Record<string, Place>, place) => {
    acc[place.id] = place;
    return acc;
}, {});

function makeNPC(id: string, name: string, stats: { hp: number; totalHp: number; attack: number; defence: number }, opts: Partial<NPC> = {}): NPC {
    const character = new Character({ id, name, stats: new Stats(stats) });
    return {
        id,
        character,
        talk: opts.talk ?? '…',
        xpReward: opts.xpReward ?? 10,
        goldReward: opts.goldReward ?? 5,
        level: opts.level,
        customXp: opts.customXp,
        recruitOnDefeat: opts.recruitOnDefeat,
        dropTable: opts.dropTable,
        respawns: opts.respawns,
    };
}

const GOBLIN_DROP = new DropTable([
    { itemId: 'health_potion', chance: 0.6, minQty: 1, maxQty: 1 },
    { itemId: 'rusty_sword', chance: 0.2, minQty: 1, maxQty: 1 },
]);

const TROLL_DROP = new DropTable([
    { itemId: 'rusty_sword', chance: 0.5, minQty: 1, maxQty: 1 },
    { itemId: 'health_potion', chance: 0.7, minQty: 1, maxQty: 2 },
]);

const GOLEM_DROP = new DropTable([
    { itemId: 'cursed_ring', chance: 0.4, minQty: 1, maxQty: 1 },
    { itemId: 'wooden_shield', chance: 0.4, minQty: 1, maxQty: 1 },
    { itemId: 'fire_staff', chance: 0.15, minQty: 1, maxQty: 1 },
]);

export const BANDIT_DROP = new DropTable([
    { itemId: 'health_potion', chance: 0.5, minQty: 1, maxQty: 2 },
    { itemId: 'longbow', chance: 0.2, minQty: 1, maxQty: 1 },
]);

export function createInitialWorld(): { team: Team; npcs: Map<string, NPC[]> } {
    const team = new Team();
    team.addCharacter(buildHero());
    team.addCharacter(buildCompanion());
    const ember = buildEmber();
    team.addCharacter(ember);
    team.inventory.addItem(makeRustySword());
    team.inventory.addItem(makeWoodenShield());
    team.inventory.addItem(makeHealthPotion(), 3);
    team.inventory.addItem(makeCursedRing());
    team.inventory.addItem(makeFireSword());
    equipToCharacter(team.inventory, ember, 'fire_sword');
    team.gold = 20;

    const npcs = new Map<string, NPC[]>();
    npcs.set('central_town', [
        makeNPC('wanderer', 'Wandering Fighter', { hp: 25, totalHp: 25, attack: 7, defence: 1 }, {
            talk: '"Looking for a friendly spar?"',
            xpReward: 20,
            goldReward: 8,
            respawns: true,
        }),
        makeNPC(SAGE_SPIRIT.id, SAGE_SPIRIT.name, {
            hp: SAGE_SPIRIT.hp,
            totalHp: SAGE_SPIRIT.totalHp,
            attack: SAGE_SPIRIT.attack,
            defence: SAGE_SPIRIT.defence,
        }, {
            talk: SAGE_SPIRIT.talk,
            xpReward: 0,
            goldReward: 0,
            customXp: SAGE_SPIRIT.customXp,
            respawns: true,
        }),
    ]);
    npcs.set('forest', [
        makeNPC('goblin', 'Goblin', { hp: 30, totalHp: 30, attack: 6, defence: 0 }, {
            talk: '"Grrr… shiny! Mine!"',
            xpReward: 25,
            goldReward: 12,
            dropTable: GOBLIN_DROP,
            respawns: true,
        }),
    ]);
    npcs.set('cave', [
        makeNPC('troll', 'Cave Troll', { hp: 50, totalHp: 50, attack: 9, defence: 1 }, {
            talk: '"Who dares enter my cave?"',
            xpReward: 40,
            goldReward: 20,
            dropTable: TROLL_DROP,
            respawns: true,
        }),
    ]);
    npcs.set('training', [
        makeNPC('dummy', 'Practice Dummy', { hp: 400, totalHp: 400, attack: 0, defence: 12 }, {
            talk: '"…"',
            xpReward: 5,
            goldReward: 0,
            respawns: true,
        }),
        makeNPC('iron_golem', 'Iron Golem', { hp: 250, totalHp: 250, attack: 3, defence: 8 }, {
            talk: '"CLANK. CLANK."',
            xpReward: 60,
            goldReward: 30,
            dropTable: GOLEM_DROP,
            respawns: true,
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

export function makeGroupTeam(groupId: string = 'bandits'): Team {
    if (groupId === 'elemental') {
        const golem = new Character({
            id: FIRE_GOLEM.id,
            name: FIRE_GOLEM.name,
            stats: new Stats({
                hp: FIRE_GOLEM.hp,
                totalHp: FIRE_GOLEM.totalHp,
                attack: FIRE_GOLEM.attack,
                defence: FIRE_GOLEM.defence,
            }),
        });
        const wraith = new Character({
            id: ICE_WRAITH.id,
            name: ICE_WRAITH.name,
            stats: new Stats({
                hp: ICE_WRAITH.hp,
                totalHp: ICE_WRAITH.totalHp,
                attack: ICE_WRAITH.attack,
                defence: ICE_WRAITH.defence,
            }),
        });
        setAffinity(golem.id, 'fire', FIRE_GOLEM.fireMultiplier);
        setAffinity(wraith.id, 'fire', ICE_WRAITH.fireMultiplier);
        return new Team({ id: 'elementals', members: [golem, wraith] });
    }

    const members = Array.from({ length: 3 }, (_, i) =>
        new Character({
            id: `bandit_${i}`,
            name: `Bandit ${i + 1}`,
            stats: new Stats({ hp: 14, totalHp: 14, attack: 7, defence: 0 }),
        }),
    );
    return new Team({ id: 'bandits', members });
}
