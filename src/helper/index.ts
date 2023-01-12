import { getDefaultDefenceObject, getDefaultAttackObject, getStatsObject } from "./object";

function uniqueID() {
    return Math.floor(Math.random() * Math.floor(Math.random() * Date.now()));
}

function getNestedPropByString<T extends {}>(obj: T, keySearched: string) {
    //get keys. 'attack' -> ['attack'] || attack.magicAttack -> ['attack', 'magicAttack']
    let solution = obj;
    let timesCounted = 0;
    try {
        let lastCorrectSolution = solution;
        let campos = keySearched.split('.')

        campos.forEach(val => {
            if (solution[val] !== undefined) {
                lastCorrectSolution = solution;
                solution = solution[val];
                timesCounted++
            } else {
                solution = lastCorrectSolution;
            }
        })
    } catch (e) {
        console.log(e)
    }

    return !timesCounted ? undefined : solution as unknown as typeof obj[keyof typeof obj];
}

function isPrimitiveType(test) {
    return test !== Object(test);
}

function mergeObjects(data) {
    const result = {}

    data.forEach(basket => {
        for (let [key, value] of Object.entries(basket)) {
            if (result[key]) {
                result[key] += value
            } else {
                result[key] = value
            }
        }
    });
    return result
}

export { 
    uniqueID, 
    getNestedPropByString, 
    isPrimitiveType, 
    mergeObjects, 
    getDefaultDefenceObject,
    getDefaultAttackObject,
    getStatsObject };
