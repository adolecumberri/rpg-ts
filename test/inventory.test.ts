import { Character } from '../src/classes/Character';
import { Item } from '../src/classes/items/Item';
import { MODIFICATION_TYPES } from '../src/constants/stats.constants';

describe('Inventory + Item stat layering', () => {
    it('stacks status modifiers and item modifiers together', () => {
        const character = new Character();
        character.stats.attack = 100;

        // status-like source (backward-compatible API)
        character.stats.statsModifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 20);

        const sword = new Item({
            id: 'sword',
            name: 'Sword of Focus',
            effects: [
                { stat: 'attack', typeOfModification: MODIFICATION_TYPES.BUFF_PERCENTAGE, value: 10 },
                { stat: 'attack', typeOfModification: MODIFICATION_TYPES.BUFF_FIXED, value: 5 },
            ],
        });

        character.inventory.addItem(sword);
        character.inventory.equipItem(sword.id);

        expect(character.stats.get('attack')).toBe(135);
    });

    it('removes only item modifiers when unequipped', () => {
        const character = new Character();
        character.stats.attack = 80;

        character.stats.statsModifier.setModifier('attack', MODIFICATION_TYPES.BUFF_FIXED, 20);

        const ring = new Item({
            id: 'ring',
            name: 'Ring of Power',
            effects: [
                { stat: 'attack', typeOfModification: MODIFICATION_TYPES.BUFF_FIXED, value: 10 },
            ],
        });

        character.inventory.addItem(ring);
        character.inventory.equipItem(ring.id);
        expect(character.stats.get('attack')).toBe(110);

        character.inventory.unEquipItem(ring.id);
        expect(character.stats.get('attack')).toBe(100);
    });
});
