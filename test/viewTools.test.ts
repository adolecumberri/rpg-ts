import { WorldSession } from '../worldTest/core/session';
import { buildTravelGraph } from '../worldTest/core/view/travelGraph';
import { buildSkillTreeView } from '../worldTest/core/view/skillTreeView';
import { dropTableRows, dropTableSummaries } from '../worldTest/core/view/dropTableView';
import { PLACES, BANDIT_DROP } from '../worldTest/core/world';

describe('travel graph', () => {
    it('builds nodes and collapses bidirectional connections into one edge', () => {
        const graph = buildTravelGraph(PLACES, new Set());

        expect(graph.nodes).toHaveLength(PLACES.length);

        const centralForest = graph.edges.filter(
            (edge) =>
                (edge.from === 'central_town' && edge.to === 'forest') ||
                (edge.from === 'forest' && edge.to === 'central_town'),
        );
        expect(centralForest).toHaveLength(1);
    });

    it('marks flag-gated edges as locked until the flag is unlocked', () => {
        const lockedGraph = buildTravelGraph(PLACES, new Set());
        const lockedEdge = lockedGraph.edges.find(
            (edge) =>
                (edge.from === 'central_town' && edge.to === 'east_town') ||
                (edge.from === 'east_town' && edge.to === 'central_town'),
        );
        expect(lockedEdge?.locked).toBe(true);

        const unlockedGraph = buildTravelGraph(PLACES, new Set(['east_unlocked']));
        const unlockedEdge = unlockedGraph.edges.find(
            (edge) =>
                (edge.from === 'central_town' && edge.to === 'east_town') ||
                (edge.from === 'east_town' && edge.to === 'central_town'),
        );
        expect(unlockedEdge?.locked).toBe(false);
    });
});

describe('skill tree view', () => {
    it('maps nodes with learned/unlockable state and previous-node edges', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        const tree = session.skillTreeOf('hero')!;
        const context = { character: hero, session, tree };

        const view = buildSkillTreeView(tree, context);
        expect(view.nodes).toHaveLength(5);
        expect(view.edges).toEqual([{ from: 'warcry', to: 'chain_bolt' }]);
        expect(view.nodes.find((node) => node.id === 'warcry')!.unlockable).toBe(false); // level 1

        hero.experience.gain(50); // level 2
        const viewAfterLevel = buildSkillTreeView(tree, context);
        const warcry = viewAfterLevel.nodes.find((node) => node.id === 'warcry')!;
        expect(warcry.unlockable).toBe(true);
        expect(warcry.learned).toBe(false);
    });
});

describe('drop table view', () => {
    it('converts drop tables into rows with item names and chances', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const rows = dropTableRows(BANDIT_DROP, session.itemTable);

        expect(rows).toHaveLength(2);
        expect(rows[0].itemName).toBe('Health Potion');
        expect(rows[0].chance).toBe(0.5);
        expect(rows[0].minQty).toBe(1);
        expect(rows[0].maxQty).toBe(2);
    });

    it('summarizes every creature drop table', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const sources = dropTableSummaries(session).map((summary) => summary.source);

        expect(sources).toContain('Goblin');
        expect(sources).toContain('Cave Troll');
        expect(sources).toContain('Iron Golem');
        expect(sources).toContain('Bandits');
        expect(sources).toContain('Goblin Chief');
        expect(sources).toContain('Arena Champion');
    });
});
