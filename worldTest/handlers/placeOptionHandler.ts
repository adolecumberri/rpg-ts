import { PlaceId, PlaceOption } from "../../src/world";
import { MenuChoice } from "../Menu";
import { MenuBuildDependencies } from "../menu/createMenu";

export function buildPlaceOptionChoice(option: PlaceOption, dependencies: MenuBuildDependencies): MenuChoice {
    return {
        label: option.label,
        execute: async () => {
            const payload = option.payload ?? {};
            const actionType = payload.actionType;

            if (actionType === "travel") {
                const to = payload.to as PlaceId | undefined;
                if (!to) {
                    await dependencies.waitForAnyKey("Travel option is missing destination. Press any key...");
                    return true;
                }

                dependencies.player.travelTo(dependencies.world, to, {
                    data: {
                        source: "place_option",
                        optionId: option.id,
                    },
                });
                await dependencies.onPlaceEnter(to);
                return true;
            }

            await dependencies.waitForAnyKey(`${option.description ?? "No action attached yet."}\n\nPress any key to continue...`);
            return true;
        },
    };
}
