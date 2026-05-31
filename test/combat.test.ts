import { Character } from '../src/classes/Character';
import { Combat } from '../src/classes/Combat';
import { Stats } from '../src/classes/Stats';
import { Team } from '../src/classes/Team';

describe('Combat automatic battles', () => {
    it('resolves automatic character vs character combat', () => {
        const left = new Character({
            id: 'left',
            stats: new Stats({ hp: 30, totalHp: 30, attack: 10, defence: 0 }),
        });

        const right = new Character({
            id: 'right',
            stats: new Stats({ hp: 20, totalHp: 20, attack: 5, defence: 0 }),
        });

        const combat = new Combat({ randomTarget: false });
        const result = combat.autoBetweenCharacters(left, right);

        expect(result.winner).toBe('left');
        expect(result.rounds).toBeGreaterThan(0);
        expect(result.turns.length).toBeGreaterThan(0);
        expect(result.rightSurvivors).toEqual([]);
        expect(right.stats.hp).toBe(0);
        expect(right.stats.isAlive).toBe(0);
    });

    it('resolves automatic team vs team combat', () => {
        const teamA = new Team({
            id: 'A',
            members: [
                new Character({ id: 'A1', stats: new Stats({ hp: 20, totalHp: 20, attack: 8, defence: 0 }) }),
                new Character({ id: 'A2', stats: new Stats({ hp: 20, totalHp: 20, attack: 8, defence: 0 }) }),
            ],
        });

        const teamB = new Team({
            id: 'B',
            members: [
                new Character({ id: 'B1', stats: new Stats({ hp: 20, totalHp: 20, attack: 5, defence: 0 }) }),
                new Character({ id: 'B2', stats: new Stats({ hp: 20, totalHp: 20, attack: 5, defence: 0 }) }),
            ],
        });

        const combat = new Combat({ randomTarget: false });
        const result = combat.autoBetweenTeams(teamA, teamB);

        expect(result.winner).toBe('left');
        expect(result.rightSurvivors).toEqual([]);
        expect(result.leftSurvivors.length).toBeGreaterThan(0);
        expect(teamB.getAlive().length).toBe(0);
    });

    it('returns draw if no one can deal damage and stalemate guard is enabled', () => {
        const left = new Character({
            id: 'left-no-dmg',
            stats: new Stats({ hp: 20, totalHp: 20, attack: 0, defence: 999 }),
        });

        const right = new Character({
            id: 'right-no-dmg',
            stats: new Stats({ hp: 20, totalHp: 20, attack: 0, defence: 999 }),
        });

        const combat = new Combat({ randomTarget: false, maxRounds: 50, stopOnStalemate: true });
        const result = combat.auto(left, right);

        expect(result.winner).toBe('draw');
        expect(result.rounds).toBe(1);
        expect(left.stats.hp).toBe(20);
        expect(right.stats.hp).toBe(20);
    });
});
