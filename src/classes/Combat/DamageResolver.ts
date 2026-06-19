import { Character } from "../Character";
import { CombatContext } from "./Combat.interfaces";
import { DamagePacket } from "./DamagePacket";


export class DamageResolver {
    static apply(context: CombatContext) {
        if (!context.damagePackets) return;

        //TODO: this damages every target with every packet.
        for (const packet of context.damagePackets) {
            for (const target of context.targets) {
                target.stats.hp -= this.calculate(packet, target);
            }
        }
    }

    static calculate(packet: DamagePacket, target: Character): number {
        return packet.amount; // later expand with resistances, armor, etc
    }
}