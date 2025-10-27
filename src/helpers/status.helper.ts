import { MODIFICATION_TYPES } from '../constants/common.constants';
import { DEFAULT_STATUS_OBJECT } from '../constants/status.constants';
import { ModificationsType } from '../types/common.types';
import { StatusActivationFunction, StatusDefinition } from '../types/status.types';
import { createDefaultObjectGetter } from './common.helpers';

type ActionHandler = StatusActivationFunction;

const ACTION_HANDLERS: Record<ModificationsType, ActionHandler> = {
    [MODIFICATION_TYPES.BUFF_FIXED]: ({ to, value }) => ({
        finalValue: to + value,
        appliedValue: value,
    }),
    [MODIFICATION_TYPES.BUFF_PERCENTAGE]: ({ from, to, value }) => ({
        finalValue: to + from * (value / 100),
        appliedValue: from * (value / 100),
    }),
    [MODIFICATION_TYPES.DEBUFF_FIXED]: ({ to, value }) => ({
        finalValue: to - value,
        appliedValue: -value,
    }),
    [MODIFICATION_TYPES.DEBUFF_PERCENTAGE]: ({ from, to, value }) => ({
        finalValue: to - from * (value / 100),
        appliedValue: -(from * (value / 100)),
    }),
};

const getDefaultStatus = createDefaultObjectGetter<Partial<StatusDefinition>>(DEFAULT_STATUS_OBJECT);


export {
    ActionHandler,
    ACTION_HANDLERS,
    getDefaultStatus,
};
