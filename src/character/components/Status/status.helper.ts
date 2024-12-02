import { createDefaultObjectGetter } from '../../../common/common.helpers';
import Status from '../Status';
import { DEFAULT_STATUS_OBJECT } from './status.constants';


const getDefaultStatus = createDefaultObjectGetter<Partial<Status>>(DEFAULT_STATUS_OBJECT);

export {
    getDefaultStatus,
};
