
import Status from '../Status';
import { DEFAULT_STATUS_OBJECT } from '../../constants/status.constants';
import { createDefaultObjectGetter } from '../../helpers/common.helpers';


const getDefaultStatus = createDefaultObjectGetter<Partial<Status>>(DEFAULT_STATUS_OBJECT);

export {
    getDefaultStatus,
};
