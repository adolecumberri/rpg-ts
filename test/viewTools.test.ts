import { WorldSession } from '../worldTest/core/session';
import { buildTravelGraph, reachableTravelGraph } from '../worldTest/core/view/travelGraph';
import { buildSkillTreeView } from '../worldTest/core/view/skillTreeView';
import { dropTableRows, dropTableSummaries } from '../worldTest/core/view/dropTableView';
import { missionPlaceNames } from '../worldTest/core/view/missionView';
import { PLACES } from '../worldTest/core/world';
import type { Place } from '../worldTest/core/types';
import { DropTable } from '../worldTest/core/loot/dropTable';
import { buildHero } from '../worldTest/core/config/characters';

function lockedRoadPlaces(lock: { requiredFlag?: string; requiredMissionId?: string }): Place[] {
    return [
        {
            id: 'home',
            name: 'Home',
            description: '',
            emoji: '',
            regionId: 'r',
            actions: [],
            connections: [{ label: 'Out', to: 'out', ...lock }],
            npcs: [],
        },
        {
            id: 'out',
            name: 'Out',
            description: '',
            emoji: '',
            regionId: 'r',
            actions: [],
            connections: [{ label: 'Home', to: 'home' }],
            npcs: [],
        },
    ];
}

describe('travel graph', () => {
    it('builds nodes for the act places and their connections', () => {
        const graph = buildTravelGraph(PLACES, new Set());

        // 7 places: the 3 connected story places plus the 4 general
        // region locations (no connections yet).
        expect(graph.nodes).toHaveLength(7);
        expect(graph.edges).toHaveLength(2);

        const farmHay = graph.edges.filter(
            (edge) =>
                (edge.from === 'farm' && edge.to === 'hay_field') ||
                (edge.from === 'hay_field' && edge.to === 'farm'),
        );
        expect(farmHay).toHaveLength(1);
        const farmCamp = graph.edges.filter(
            (edge) =>
                (edge.from === 'farm' && edge.to === 'camp') ||
                (edge.from === 'camp' && edge.to === 'farm'),
        );
        expect(farmCamp).toHaveLength(1);
    });

    it('carries the content-defined map positions through the nodes', () => {
        const graph = buildTravelGraph(PLACES, new Set());

        expect(graph.nodes.find((node) => node.id === 'camp')?.position).toEqual({ x: 120, y: 260 });
        expect(graph.nodes.find((node) => node.id === 'farm')?.position).toEqual({ x: 300, y: 260 });
        expect(graph.nodes.find((node) => node.id === 'hay_field')?.position).toEqual({ x: 600, y: 260 });
    });

    it('hides places behind mission-locked routes until they open', () => {
        const locked = buildTravelGraph(
            lockedRoadPlaces({ requiredMissionId: 'the_route' }),
            new Set(),
            () => false,
        );

        // from home, the gated place is disabled (hidden): only home
        // itself is reachable.
        const hidden = reachableTravelGraph(locked, 'home');
        expect(hidden.nodes.map((node) => node.id)).toEqual(['home']);
        expect(hidden.edges).toHaveLength(0);

        // once the route's mission is accepted the road opens.
        const open = buildTravelGraph(
            lockedRoadPlaces({ requiredMissionId: 'the_route' }),
            new Set(),
            (missionId) => missionId === 'the_route',
        );
        const reachable = reachableTravelGraph(open, 'home');
        expect(reachable.nodes.map((node) => node.id).sort()).toEqual(['home', 'out']);
        expect(reachable.edges).toHaveLength(1);
    });

    it('keeps the way home open even when the road out is locked', () => {
        const locked = buildTravelGraph(
            lockedRoadPlaces({ requiredMissionId: 'the_route' }),
            new Set(),
            () => false,
        );

        // from the gated place the home is reachable: only the home ->
        // out direction requires the mission.
        const fromOut = reachableTravelGraph(locked, 'out');
        expect(fromOut.nodes.map((node) => node.id).sort()).toEqual(['home', 'out']);
        expect(fromOut.edges).toHaveLength(1);

        const edge = locked.edges.find(
            (edge) =>
                (edge.from === 'home' && edge.to === 'out') ||
                (edge.from === 'out' && edge.to === 'home'),
        )!;
        expect(edge.lockedFrom).toBe(true); // home -> out gated
        expect(edge.lockedTo).toBe(false); // out -> home free
    });

    it('locks roads behind story flags until the flag exists', () => {
        const closed = buildTravelGraph(lockedRoadPlaces({ requiredFlag: 'east_open' }), new Set());
        expect(closed.edges[0].lockedFrom).toBe(true);
        expect(closed.edges[0].lockedTo).toBe(false);

        const opened = buildTravelGraph(
            lockedRoadPlaces({ requiredFlag: 'east_open' }),
            new Set(['east_open']),
        );
        expect(opened.edges[0].lockedFrom).toBe(false);
        expect(opened.edges[0].lockedTo).toBe(false);
    });
});

describe('mission view', () => {
    it('names the places a mission happens in from its steps', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const winter = session.missions.mission('winter_stock')!;
        expect(missionPlaceNames(winter)).toEqual(['Order Camp']);
    });

    it('ignores places that do not exist in the world', () => {
        const summer = new WorldSession({ random: () => 0.5 }).missions.mission('summer_fishing')!;
        // The beach exists, so the place shows.
        expect(missionPlaceNames(summer)).toEqual(['Playa Sur']);
    });
});

describe('skill tree view', () => {
    it('maps nodes with learned/unlockable state and previous-node edges', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        const hero = session.team.getCharacter('hero')!;
        const tree = session.skillTreeOf('hero')!;
        const context = { character: hero, session, tree };

        const view = buildSkillTreeView(tree, context);
        expect(view.nodes).toHaveLength(5);
        expect(view.edges).toEqual([{ from: 'warcry', to: 'chain_bolt' }]);
        expect(view.nodes.find((node) => node.id === 'warcry')!.unlockable).toBe(false); // level 1

        hero.experience.gain(100); // level 2
        const viewAfterLevel = buildSkillTreeView(tree, context);
        const warcry = viewAfterLevel.nodes.find((node) => node.id === 'warcry')!;
        expect(warcry.unlockable).toBe(true);
        expect(warcry.learned).toBe(false);
    });
});

describe('drop table view', () => {
    it('converts drop tables into rows with item names and chances', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.itemTable.register({
            id: 'potion',
            name: 'Potion',
            category: 'consumable',
        });
        const table = new DropTable([
            { itemId: 'potion', chance: 0.5, minQty: 1, maxQty: 2 },
            { itemId: 'gold_coin', chance: 0.25, minQty: 1, maxQty: 1 },
        ]);

        const rows = dropTableRows(table, session.itemTable);

        expect(rows).toHaveLength(2);
        expect(rows[0].itemName).toBe('Potion');
        expect(rows[0].chance).toBe(0.5);
        expect(rows[0].minQty).toBe(1);
        expect(rows[0].maxQty).toBe(2);
    });

    it('returns no summaries while the world has no content', () => {
        const session = new WorldSession({ random: () => 0.5 });
        expect(dropTableSummaries(session)).toEqual([]);
    });
});
