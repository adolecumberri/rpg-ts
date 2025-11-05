import { MODIFICATION_TYPES } from "../constants/common.constants";


type ModificationsType = typeof MODIFICATION_TYPES[keyof typeof MODIFICATION_TYPES] | "procesedStat";

export {
    ModificationsType
}