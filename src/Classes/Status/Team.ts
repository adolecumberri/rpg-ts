import { Character } from "../Character";

class Team<T extends object = {}>{
    private readonly id: string;
    private readonly name: string;
    private members: Character<T>[] = [];


    constructor(name: string, initialMembers?: Character<T>[]){
        this.id = `team-${Math.random().toString(36).slice(2, 9)}`;
        this.name = name;
        if (initialMembers) this.members = [...initialMembers];
    }
    addMember(character: Character<T>) {
        this.members.push(character);
       }
    removeMember(characterId: string ){
        this.members = this.members.filter(c => c.id !== characterId);
    }
    getAllMembers(): Character<T>[] {
        return [...this.members];
     }

    getAliveMembers(): Character<T>[] {
        return this.members.filter(c => c.isAlive());
    }

    getDeadMembers(): Character<T>[] {
        return this.members.filter(c => !c.isAlive());
    }

    getMemberById(id: string): Character<T> | undefined {
        return this.members.find(c => c.id === id);
    }

    getTeamStatsSummary() {
        return {
            totalMembers: this.members.length,
            alive: this.getAliveMembers().length,
            dead: this.getDeadMembers().length,
        };
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            members: this.members.map(m => m.toJSON()),
        };
    }
}

export { Team }
