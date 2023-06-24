import { DEFAULT_STATUS_OBJECT } from '../constants';
import { Status } from '../classes';
import { createDefaultObjectGetter } from './';

const getDefaultStatus = createDefaultObjectGetter<Partial<Status>>(DEFAULT_STATUS_OBJECT);

export {
  getDefaultStatus,
};
