const createDefaultObjectGetter = <T>(defaultObject: T) => (param?: Partial<T>): T => {
  return { ...defaultObject, ...param };
};

function getRandomInt(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function uniqueID() {
  return Math.floor(Math.random() * Math.floor(Math.random() * Date.now()));
}

export {
  createDefaultObjectGetter,
  getRandomInt,
  uniqueID,
};
