import { WorldSession } from '../worldTest/core/session';
import { buildTravelGraph, reachableTravelGraph } from '../worldTest/core/view/travelGraph';
import { buildSkillTreeView } from '../worldTest/core/view/skillTreeView';
import { dropTableRows, dropTableSummaries } from '../worldTest/core/view/dropTableView';
import { missionPlaceNames } from '../worldTest/core/view/missionView';
import { PLACES } from '../worldTest/core/world';
import { DropTable } from '../worldTest/core/loot/dropTable';
import { buildHero } from '../worldTest/core/config/characters';

describe('travel graph', () => {
    it('builds nodes for the act places and their connections', () => {
        const graph = buildTravelGraph(PLACES, new Set());

        expect(graph.nodes).toHaveLength(2);
        expect(graph.edges).toHaveLength(1);

        const farmHay = graph.edges.filter(
            (edge) =>
                (edge.from === 'farm' && edge.to === 'hay_field') ||
                (edge.from === 'hay_field' && edge.to === 'farm'),
        );
        expect(farmHay).toHaveLength(1);
    });

    it('carries the content-defined map positions through the nodes', () => {
        const graph = buildTravelGraph(PLACES, new Set());

        expect(graph.nodes.find((node) => node.id === 'farm')?.position).toEqual({ x: 300, y: 260 });
        expect(graph.nodes.find((node) => node.id === 'hay_field')?.position).toEqual({ x: 600, y: 260 });
    });

    it('hides places behind mission-locked routes until they open', () => {
        const locked = buildTravelGraph(PLACES, new Set(), () => false);

        // from the farm, the locked hay field is disabled (hidden)
        const hidden = reachableTravelGraph(locked, 'farm');
        expect(hidden.nodes.map((node) => node.id)).toEqual(['farm']);
        expect(hidden.edges).toEqual([]);

        // once the sickles mission is accepted the route opens
        const open = buildTravelGraph(PLACES, new Set(), (missionId) => missionId === 'sickles_to_hay');
        const reachable = reachableTravelGraph(open, 'farm');
        expect(reachable.nodes.map((node) => node.id)).toEqual(['farm', 'hay_field']);
        expect(reachable.edges).toHaveLength(1);
    });

    it('keeps the way home open even when the road out is locked', () => {
        const locked = buildTravelGraph(PLACES, new Set(), () => false);

        // from the hay field the farm is reachable: only the farm ->
        // hay direction requires the mission.
        const fromHay = reachableTravelGraph(locked, 'hay_field');
        expect(fromHay.nodes.map((node) => node.id)).toEqual(['farm', 'hay_field']);
        expect(fromHay.edges).toHaveLength(1);

        const edge = locked.edges[0];
        expect(edge.lockedFrom).toBe(true); // farm -> hay gated
        expect(edge.lockedTo).toBe(false); // hay -> farm free
    });
});

describe('mission view', () => {
    it('names the places a mission happens in from its steps', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const sickles = session.missions.mission('sickles_to_hay')!;
        expect(missionPlaceNames(sickles)).toEqual(['Hay Field']);

        const wood = session.missions.mission('chop_wood')!;
        expect(missionPlaceNames(wood)).toEqual(["The Lord's Farm"]);
    });

    it('ignores places that do not exist in the world', () => {
        const cow = new WorldSession({ random: () => 0.5 }).missions.mission('cow_hunt')!;
        // The forest is not built yet; only the farm marker shows.
        expect(missionPlaceNames(cow)).toEqual([]);
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
