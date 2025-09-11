import { DEFAULT_STATUS_OBJECT, STATUS_TYPES } from '../constants/status.constants';
import { StatusActivationFunction, StatusDefinition, StatusType } from '../types/status.types';
import { createDefaultObjectGetter } from './common.helpers';

type ActionHandler = StatusActivationFunction;

const ACTION_HANDLERS: Record<StatusType, ActionHandler> = {
    [STATUS_TYPES.BUFF_FIXED]: ({ to, value }) => ({
        finalValue: to + value,
        appliedValue: value,
    }),
    [STATUS_TYPES.BUFF_PERCENTAGE]: ({ from, to, value }) => ({
        finalValue: to + from * (value / 100),
        appliedValue: from * (value / 100),
    }),
    [STATUS_TYPES.DEBUFF_FIXED]: ({ to, value }) => ({
        finalValue: to - value,
        appliedValue: -value,
    }),
    [STATUS_TYPES.DEBUFF_PERCENTAGE]: ({ from, to, value }) => ({
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
