

function uniqueID() {
    return String(Math.floor(Math.random() * Math.floor(Math.random() * Date.now())));
}

function getRandomInt(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min) + min);
}

/*
encapsulates adding HP and totalHP check logic.
*/
function lifeCheckHelper({ hp = 0, totalHp = 0, clamped = false }: { hp?: number; totalHp?: number, clamped?: boolean }) {
    let newTotalHp = Math.max(1, totalHp);
    let newHp = Math.max(0, hp);

    if (clamped && hp > totalHp) {
        newHp = totalHp;
    }

    return {
        hp: newHp,
        isAlive: newHp > 0 ? 1 : 0,
        totalHp: newTotalHp,
    };
}

export {
    getRandomInt,
    uniqueID,
    lifeCheckHelper,
};
