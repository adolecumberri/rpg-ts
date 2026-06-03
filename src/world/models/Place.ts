export type PlaceId = string;

export type PlaceType =
    | "town"
    | "shop"
    | "wild";

export type PlaceConnection = {
    to: PlaceId;
    travelCost?: number;
    requiredFlags?: string[];
};

export type PlaceShop = {
    id: string;
    inventoryPoolId: string;
    refreshHours?: number;
};

export type PlaceEvent = {
    id: string;
    once?: boolean;
    payload?: Record<string, unknown>;
};

export type PlaceOption = {
    id: string;
    label: string;
    description?: string;
    payload?: Record<string, unknown>;
};

export type TravelInfo = {
    playerId?: string;
    unlockedFlags?: string[];
    data?: Record<string, unknown>;
    [key: string]: unknown;
};

export type PlaceEventTrigger = {
    placeId: PlaceId;
    event: PlaceEvent;
    info?: TravelInfo;
};

export type PlaceEventHandler = (trigger: PlaceEventTrigger) => void;

export type WorldTravelRequest = {
    from: PlaceId;
    to: PlaceId;
    info?: TravelInfo;
    onEvent?: PlaceEventHandler;
};

export type WorldTravelResult = {
    from: Place;
    to: Place;
    triggeredEvents: PlaceEvent[];
    info?: TravelInfo;
};

export interface WorldNavigator {
    travel(request: WorldTravelRequest): WorldTravelResult;
}

export type PlaceDefinition = {
    id: PlaceId;
    name: string;
    type: PlaceType;
    description?: string;
    tags?: string[];
    options?: PlaceOption[];
    connections?: PlaceConnection[];
    events?: PlaceEvent[];
    shops?: PlaceShop[];
    metadata?: Record<string, unknown>;
};

export class Place {
    readonly id: PlaceId;
    readonly definition: PlaceDefinition;
    private triggeredEventIds: Set<string> = new Set();

    constructor(definition: PlaceDefinition) {
        this.id = definition.id;
        this.definition = {
            ...definition,
            tags: definition.tags ?? [],
            options: definition.options ?? [],
            connections: definition.connections ?? [],
            events: definition.events ?? [],
            shops: definition.shops ?? [],
            metadata: definition.metadata ?? {},
        };
    }

    isType(type: PlaceType): boolean {
        return this.definition.type === type;
    }

    getConnections(): PlaceConnection[] {
        return [...(this.definition.connections ?? [])];
    }

    getOptions(): PlaceOption[] {
        return [...(this.definition.options ?? [])];
    }

    getConnectedPlaceIds(): PlaceId[] {
        return this.getConnections().map((connection) => connection.to);
    }

    getEvents(): PlaceEvent[] {
        return [...(this.definition.events ?? [])];
    }

    enter(info?: TravelInfo, onEvent?: PlaceEventHandler): PlaceEvent[] {
        const triggered: PlaceEvent[] = [];

        for (const event of this.getEvents()) {
            const runOnce = event.once !== false;
            const alreadyTriggered = this.triggeredEventIds.has(event.id);

            if (runOnce && alreadyTriggered) {
                continue;
            }

            triggered.push(event);
            onEvent?.({ placeId: this.id, event, info });

            if (runOnce) {
                this.triggeredEventIds.add(event.id);
            }
        }

        return triggered;
    }

    resetTriggeredEvents(): void {
        this.triggeredEventIds.clear();
    }

    travelTo({
        to,
        world,
        info,
        onEvent,
    }: {
        to: PlaceId;
        world: WorldNavigator;
        info?: TravelInfo;
        onEvent?: PlaceEventHandler;
    }): WorldTravelResult {
        return world.travel({
            from: this.id,
            to,
            info,
            onEvent,
        });
    }

    canTravelTo(targetPlaceId: PlaceId, unlockedFlags: string[] = []): boolean {
        const connection = this.getConnections().find((item) => item.to === targetPlaceId);
        if (!connection) return false;

        const required = connection.requiredFlags ?? [];
        return required.every((flag) => unlockedFlags.indexOf(flag) !== -1);
    }
}
