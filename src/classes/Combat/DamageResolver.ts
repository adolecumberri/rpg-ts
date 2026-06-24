import { Character } from "../Character";
import { CombatContext } from "./Combat.interfaces";
import { DamagePacket } from "./DamagePacket";


export class DamageResolver {

    static apply(context: CombatContext) {

        for (const targetEffect of context.targetEffects) {

            const target = targetEffect.target;

            for (const packet of targetEffect.damagePackets) {

                const damage =
                    this.calculate(packet, target);

                target.stats.hp -= damage;
            }
        }

    }

    static calculate(packet: DamagePacket, target: Character): number {
        if (packet.type === "heal") {
            return -packet.amount;
        }

        return packet.amount; // later expand with resistances, armor, etc
    }

}