import { MODIFICATION_TYPES } from "../constants/common.constants";
import { Widen } from "../helpers/type.helpers";

type ModificationTypes = typeof MODIFICATION_TYPES[keyof typeof MODIFICATION_TYPES]

type OtherModificationsType = "procesedStat" | "originalStatValue";

type ModificationKeys = Widen<ModificationTypes | OtherModificationsType>;

export {
    ModificationTypes,
    ModificationKeys,
    OtherModificationsType,
}
