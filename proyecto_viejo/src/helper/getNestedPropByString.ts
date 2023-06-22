export function getNestedPropByString<T extends {}>(obj: T, keySearched: string) {
  // get keys. 'attack' -> ['attack'] || attack.magicAttack -> ['attack', 'magicAttack']
  let solution: {[x: string]: any} = obj;
  let timesCounted = 0;
  try {
    let lastCorrectSolution = solution;
    const campos = keySearched.split('.');

    campos.forEach((val) => {
      if (solution[val] !== undefined) {
        lastCorrectSolution = solution;
        solution = solution[val];
        timesCounted++;
      } else {
        solution = lastCorrectSolution;
      }
    });
  } catch (e) {
    console.log(e);
  }

  return !timesCounted ? undefined : solution as unknown as typeof obj[keyof typeof obj];
}
