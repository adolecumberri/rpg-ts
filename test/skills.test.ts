import { Skills, CHARACTER_SKILLS, DEFAULT_SKILLS, specOf } from '../worldTest/core/skills';
import { ALL_JOBS } from '../worldTest/core/constants/jobs';

describe('the skill dictionary', () => {
    it('keys every skill by its own id', () => {
        for (const [key, spec] of Object.entries(Skills)) {
            expect(key).toBe(spec.id);
            expect(specOf(key)).toBe(spec);
        }
    });

    it('every referenced skill id exists in the catalog', () => {
        const referenced = new Set<string>([...DEFAULT_SKILLS]);
        for (const ids of Object.values(CHARACTER_SKILLS)) {
            for (const id of ids) referenced.add(id);
        }
        for (const job of ALL_JOBS) {
            for (const id of job.skillIds) referenced.add(id);
        }
        for (const id of referenced) {
            expect(specOf(id)).toBeDefined();
        }
    });
});
