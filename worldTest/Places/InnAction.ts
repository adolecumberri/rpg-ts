import { PlaceAction } from "./Place";

export const innAction: PlaceAction = {
    id: "rest",

    label: "Rest at the Inn",

    onSelect: async (game) => {
        game.team.members.forEach(member => {
            member.stats.hp =
                member.stats.totalHp;

            member.stats.isAlive = 1;
        });

        await game.menu.waitForAnyKey(
            "Your party is fully rested."
        );
        return true;
    },
};

