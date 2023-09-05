import { getRandomInt } from '../../helpers';
import { CharacterCallbacks, useSkillParams, Skill } from '../../types';
import Character from '../Character';

class SkillManager {
    private skills: Skill[];

    constructor() {
        this.skills = [];
    }

    addSkill(skill: Skill) {
        this.skills.push(skill);
    }

    getSkillBy(key: keyof Skill, value: any) {
        return this.skills.find((skill) => skill[key] === value);
    }

    getSkills() {
        return this.skills;
    }

    removeSkill(key: keyof Skill, value: any) {
        this.skills = this.skills.filter((skill) => skill[key] === value);
    }

    serialize() {
        return JSON.stringify(this.skills);
    }

    static deserialize(data) {
        const skillManager = new SkillManager();
        skillManager.skills = JSON.parse(data);
        return skillManager;
    }

    useSkill( whenToUse: keyof CharacterCallbacks, params: useSkillParams) {
        const skillsToUse = this.skills.filter((skill) => {
            return skill.whenToUse.includes(whenToUse);
        });

        const skillsToUseWithProbability = skillsToUse.filter((skill) => {
            return getRandomInt(0, 99) <= skill.probability;
        });

        let solution = {};
        skillsToUseWithProbability.forEach((skill) => {
            const skillReturn = skill.use(params, skill);
            if (skillReturn) {
                solution = {
                    ...solution,
                    ...skillReturn,
                };
            }
        });

        return solution;
    }
}

export {
    SkillManager,
};
