function variance([...data]) {
    let dataLen = data.length;
    let avg = data.reduce((acc, curr) => acc + curr) / dataLen;
    let total = 0;
    for (let i = 0; i < dataLen; i++) {
        total += (data[i] - avg) ** 2;
    }
    return total / dataLen;
}

function standardDeviation([...data], { digit = 2 } = {}) {
    return Math.sqrt(variance([...data])).toFixed(digit);
}

module.exports = {
    variance, standardDeviation
};
