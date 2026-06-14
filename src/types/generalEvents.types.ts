

type CoreEvents =
    | 'attack'
    | 'defence'
    | 'battle'
    | 'die'
    | 'revive'
    | 'turn'
    | 'receive_damage';

type EventMoment = `before_${CoreEvents}` | `after_${CoreEvents}` | `on_${CoreEvents}` | (string & {});


export {
    CoreEvents,
    EventMoment,
};
