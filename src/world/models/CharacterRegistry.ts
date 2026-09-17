import { Character } from '../../classes/Character';
import { PlaceId } from './Place';

export class CharacterRegistry {
    private placeResidents = new Map<PlaceId, Character[]>();

    addResident(placeId: PlaceId, character: Character) {
        const residents = this.placeResidents.get(placeId) ?? [];
        residents.push(character);
        this.placeResidents.set(placeId, residents);
    }

    removeResident(placeId: PlaceId, characterId: string) {
        const residents = this.placeResidents.get(placeId);
        if (!residents) return;

        this.placeResidents.set(
            placeId,
            residents.filter((character) => character.id !== characterId),
        );
    }

    getResidents(placeId: PlaceId): Character[] {
        return [...(this.placeResidents.get(placeId) ?? [])];
    }
}
