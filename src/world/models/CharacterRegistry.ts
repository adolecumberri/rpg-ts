import { Character } from "../../classes/Character";
import { PlaceId } from "./Place";

export class CharacterRegistry {
    private placeResidents = new Map<PlaceId, Character[]>();

    addResident(placeId: PlaceId, character: Character) {
    }

    removeResident(placeId: PlaceId, characterId: string) {
    }

    getResidents(placeId: PlaceId) {
    }
}