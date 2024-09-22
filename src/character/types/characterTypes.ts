
type BasicStats = {
    hp: number;
    attack: number;
    defence: number;
  };

type Statistics<T> = T & { [key: string]: number };


export {
    BasicStats,
    Statistics,
};
