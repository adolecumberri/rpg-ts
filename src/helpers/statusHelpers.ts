import { DEFAULT_STATUS_OBJECT } from "../constants";
import { Status } from "../types";
import { createDefaultObjectGetter } from "./commonHelpers";

const getDefaultStatus = createDefaultObjectGetter<Status>(DEFAULT_STATUS_OBJECT);

export {
    getDefaultStatus,
}
