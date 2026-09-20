import { WorldSession } from '../worldTest/core/session';
import { buildTravelGraph } from '../worldTest/core/view/travelGraph';
import { buildSkillTreeView } from '../worldTest/core/view/skillTreeView';
import { dropTableRows, dropTableSummaries } from '../worldTest/core/view/dropTableView';
import { PLACES } from '../worldTest/core/world';
import { DropTable } from '../worldTest/core/loot/dropTable';
import { buildHero } from '../worldTest/core/config/characters';

describe('travel graph', () => {
    it('builds one node for the blank world and no edges', () => {
        const graph = buildTravelGraph(PLACES, new Set());

        expect(graph.nodes).toHaveLength(1);
        expect(graph.nodes[0].id).toBe('central_town');
        expect(graph.edges).toEqual([]);
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
