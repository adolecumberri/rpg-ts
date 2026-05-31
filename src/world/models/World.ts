import {
    Place,
    PlaceDefinition,
    PlaceEventHandler,
    PlaceId,
    TravelInfo,
    WorldNavigator,
    WorldTravelRequest,
    WorldTravelResult,
} from "./Place";

export type WorldConstructor = {
    places?: Array<Place | PlaceDefinition>;
    startPlaceId?: PlaceId;
};

export class World implements WorldNavigator {
    private places: Map<PlaceId, Place> = new Map();
    currentPlaceId?: PlaceId;

    constructor(config: WorldConstructor = {}) {
        for (const place of config.places ?? []) {
            this.addPlace(place);
        }

        if (config.startPlaceId) {
            this.setCurrentPlace(config.startPlaceId);
        } else if (this.places.size > 0) {
            this.currentPlaceId = this.getAllPlaces()[0].id;
        }
    }

    addPlace(place: Place | PlaceDefinition): Place {
        const placeInstance = place instanceof Place ? place : new Place(place);

        if (this.places.has(placeInstance.id)) {
            throw new Error(`Place with id ${placeInstance.id} already exists in world.`);
        }

        this.places.set(placeInstance.id, placeInstance);

        if (!this.currentPlaceId) {
            this.currentPlaceId = placeInstance.id;
        }

        return placeInstance;
    }

    hasPlace(id: PlaceId): boolean {
        return this.places.has(id);
    }

    getPlace(id: PlaceId): Place {
        const place = this.places.get(id);
        if (!place) {
            throw new Error(`Place with id ${id} does not exist in world.`);
        }

        return place;
    }

    getAllPlaces(): Place[] {
        return Array.from(this.places.values());
    }

    setCurrentPlace(id: PlaceId): void {
        this.getPlace(id);
        this.currentPlaceId = id;
    }

    getCurrentPlace(): Place | undefined {
        if (!this.currentPlaceId) {
            return undefined;
        }

        return this.getPlace(this.currentPlaceId);
    }

    travel(request: WorldTravelRequest): WorldTravelResult {
        const fromPlace = this.getPlace(request.from);
        const toPlace = this.getPlace(request.to);

        const unlockedFlags = request.info?.unlockedFlags ?? [];
        if (!fromPlace.canTravelTo(toPlace.id, unlockedFlags)) {
            throw new Error(`Cannot travel from ${fromPlace.id} to ${toPlace.id}.`);
        }

        this.currentPlaceId = toPlace.id;
        const triggeredEvents = toPlace.enter(request.info, request.onEvent);

        return {
            from: fromPlace,
            to: toPlace,
            triggeredEvents,
            info: request.info,
        };
    }

    travelFromCurrent({
        to,
        info,
        onEvent,
    }: {
        to: PlaceId;
        info?: TravelInfo;
        onEvent?: PlaceEventHandler;
    }): WorldTravelResult {
        if (!this.currentPlaceId) {
            throw new Error("World has no current place set.");
        }

        return this.travel({
            from: this.currentPlaceId,
            to,
            info,
            onEvent,
        });
    }
}
