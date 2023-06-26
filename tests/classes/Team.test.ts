import { Team, Character } from '../../src/classes';

describe('Team class', () => {
    let team: Team;

    beforeEach(() => {
        team = new Team({ id: 1, members: [] });
    });

    test('should add members to the team', () => {
        const character = new Character({ id: 1 });
        team.addMember(character);

        expect(team.members.length).toBe(1);
        expect(team.members[0].id).toBe(1);
    });

    test('should remove members from the team by id', () => {
        const character = new Character({ id: 1 });
        team.addMember(character);

        team.removeMemberById(1);

        expect(team.members.length).toBe(0);
    });

    test('should remove members from the team by instance', () => {
        const character = new Character({ id: 1 });
        team.addMember(character);

        team.removeMember(character);

        expect(team.members.length).toBe(0);
    });

    test('should get alive members of the team', () => {
        const character1 = new Character({ id: 1 });
        const character2 = new Character({ id: 2 });

        team.addMember(character1);
        team.addMember(character2);

        character2.die();

        const aliveMembers = team.getAliveMembers();

        expect(aliveMembers.length).toBe(1);
        expect(aliveMembers[0].id).toBe(1);
    });

    test('should check if the team is alive', () => {
        const character1 = new Character({ id: 1 });
        const character2 = new Character({ id: 2 });

        team.addMember(character1);
        team.addMember(character2);

        expect(team.isTeamAlive()).toBe(true);

        character1.die();
        character2.die();

        expect(team.isTeamAlive()).toBe(false);
    });

    test('should get dead members of the team', () => {
        const character1 = new Character({ id: 1 });
        const character2 = new Character({ id: 2 });

        team.addMember(character1);
        team.addMember(character2);

        character1.die();

        const deadMembers = team.getDeadMembers();

        expect(deadMembers.length).toBe(1);
        expect(deadMembers[0].id).toBe(1);
    });

    it('should add isDinamicImportWorking property to Team', () => {
        const team = new Team({
            isDinamicImportWorking: true,
        });
        expect(team.isDinamicImportWorking).toBeTruthy();
    });
});
