import { Dialogue } from '../worldTest/core/dialogue';

describe('dialogue', () => {
    it('reveals phrases one by one', () => {
        const dialogue = new Dialogue([
            { speaker: 'Arturo', text: 'Hey.' },
            { speaker: 'Arturo', text: 'The cow ran away!' },
        ]);

        expect(dialogue.current()).toEqual({ speaker: 'Arturo', text: 'Hey.' });
        expect(dialogue.done()).toBe(false);

        expect(dialogue.advance()).toEqual({ speaker: 'Arturo', text: 'The cow ran away!' });
        expect(dialogue.done()).toBe(false);

        expect(dialogue.advance()).toBeNull();
        expect(dialogue.done()).toBe(true);
    });

    it('counts the remaining phrases', () => {
        const dialogue = new Dialogue([
            { speaker: 'A', text: 'one' },
            { speaker: 'B', text: 'two' },
            { speaker: 'A', text: 'three' },
        ]);

        expect(dialogue.remaining()).toBe(3);
        dialogue.advance();
        expect(dialogue.remaining()).toBe(2);
        dialogue.advance();
        dialogue.advance();
        expect(dialogue.remaining()).toBe(0);
    });
});
