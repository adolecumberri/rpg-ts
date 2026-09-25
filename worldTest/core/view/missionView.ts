import type { Mission } from '../missions';
import { PLACES_BY_ID } from '../world';

/**
 * The display names of the places a mission happens in, collected from
 * its travel/task/hunt steps (used by mission details and lists).
 */
export function missionPlaceNames(mission: Mission): string[] {
    const names: string[] = [];
    for (const step of mission.steps) {
        let placeId: string | undefined;
        if (step.kind === 'travel') placeId = step.placeId;
        else if (step.kind === 'task') placeId = step.placeId;
        else if (step.kind === 'hunt') placeId = step.placeId;
        if (!placeId) continue;
        const place = PLACES_BY_ID[placeId];
        if (place && names.indexOf(place.name) === -1) names.push(place.name);
    }
    return names;
}
