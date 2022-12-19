import Character, { CharacterClass } from "../../classes/Character"
import Skill from "../../classes/Skill"
import Status from "../../classes/Status"
import { IStatAffected } from "../../interfaces/Status.interface"
import { STATUS_DURATIONS } from "../status"
import { frozen } from "./status"

let fireBall = new Skill({
    name: 'fireball',
    stats: {
        damage: 20
    },
    activate: function () {
        return (this as Skill).character.stats?.attack + (this as Skill).stats.damage
    }
})

let iceBall = new Skill({
    name: 'Ice Ball',
    stats: {
        attack: 10,
        statusPrecision: 100
    },
    activate: function (victim: CharacterClass) {
        let damage = (this as Skill).stats.attack

        if ((this as Skill).stats.statusPrecision) {
            victim.StatusManager.addStatus(frozen)
        }

        victim.setStat('hp', victim.stats.hp - damage)
    }
})

let blessing = new Skill({
    name: 'blessing',
    activate: function (user: CharacterClass) {
      
        let attackUp: IStatAffected = { from: "attack", to: "attack", value: 10, type: "BUFF_FIXED" };
        let deffenceUp: IStatAffected = { from: "defence", to: "defence", value: 10, type: "BUFF_FIXED" };

        let statusBlessing = new Status({
            statsAffected: [attackUp, deffenceUp],
            whenToApply: "ONCE",
            durationValue: 8,
            durationType: STATUS_DURATIONS.TEMPORAL,
        });

        user.StatusManager.addStatus(statusBlessing)
    }
})

export default {
    iceBall,
    fireBall,
    blessing
}