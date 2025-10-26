

type CoreEvents =
    | 'attack'
    | 'battle'
    | 'defence'
    | 'die'
    | 'revive'
    | 'turn'
    | 'receive_damage';

type EventMoment = `before_${CoreEvents}` | `after_${CoreEvents}` | (string & {});


export {
    CoreEvents,
    EventMoment,
};
