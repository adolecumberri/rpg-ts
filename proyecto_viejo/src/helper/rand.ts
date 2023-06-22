export const rand = (max: number, min = 0) => Math.round(Math.random() * (max - min) + min);

export const getProb = () => rand(100, 1);
