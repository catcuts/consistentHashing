const { cacheServers, createServers, getServer, addServers, removeServers, getHashMod } = require('./consistent_hasing_II');
const { standardDeviation } = require('./statistics');

function test({ serversConfig, data, virtualMultiTimes, debug }) {
    // ————————————————————————————————————————————————————————————————————————————————
    // ↓↓↓↓↓↓↓↓↓↓ 初始创建缓存服务器 ↓↓↓↓↓↓↓↓↓↓
    createServers(serversConfig, { virtualMultiTimes, debug });
    debug && console.debug(`Created cache servers(sorted):\n${JSON.stringify(cacheServers, null, 4)}`);
    // ↑↑↑↑↑↑↑↑↑↑ 初始创建缓存服务器 ↑↑↑↑↑↑↑↑↑↑
    // ————————————————————————————————————————————————————————————————————————————————

    // ————————————————————————————————————————————————————————————————————————————————
    // ↓↓↓↓↓↓↓↓↓↓ 数据存入到缓存服务器 ↓↓↓↓↓↓↓↓↓↓
    for (let { key, value } of data) {
        let server = getServer(key);
        server && server.setCache(key, value);
    }
    // ↑↑↑↑↑↑↑↑↑↑ 数据存入到缓存服务器 ↑↑↑↑↑↑↑↑↑↑
    // ————————————————————————————————————————————————————————————————————————————————

    // ————————————————————————————————————————————————————————————————————————————————
    // 检查所有 data 是否存放在正确的服务器上
    // 检查通过条件：不存在任何服务器 id 落在每个 data 的 __keyHash 到 __serverId 之间
    let pass = true; let showEveryTestPassLog = data.length < 10;
    for (let { key, value } of data) {
        let keyHash = getHashMod(key);
        let serverId = getServer(key, { acceptVirtual: true }).id;
        let servers = keyHash <= serverId ?
            cacheServers.filter(s => !s.isVirtual && keyHash < s.id && s.id < serverId)
            :
            cacheServers.filter(s => !s.isVirtual && s.id < serverId);
        if (servers.length) {
            pass = false;
            console.error(`[test][✗] 数据 <key: ${key}, value: ${value}, __keyHash: ${keyHash}, __serverId: ${serverId}> 应存入服务器 ${servers[0].id}`);
        }
        else {
            showEveryTestPassLog && console.log(`[test][✔️] 数据 <key: ${key}, value: ${value}, __keyHash: ${keyHash}, __serverId: ${serverId}> 已存入正确的服务器`);
        }
    }
    pass && console.log(`[test][✔️] 全部数据 <...> 已存入正确的服务器`);
    // ————————————————————————————————————————————————————————————————————————————————

    let _cacheServers = cacheServers.filter(s => !s.isVirtual);

    // ————————————————————————————————————————————————————————————————————————————————
    // 展示当前服务器负载情况
    let totalDataAmount = 0;
    console.log(`[test] 当前服务器负载情况：`);
    console.table(_cacheServers.map(s => {
        totalDataAmount += s.dataNumber;
        return {
            '服务器': `${s.name}(ip: ${s.ip}, id: ${s.id})`,
            '负载': s.dataNumber
        };
    }));
    console.log(`总计：${totalDataAmount}`);
    // ————————————————————————————————————————————————————————————————————————————————

    return { loadStdDev: standardDeviation(_cacheServers.map(s => s.dataNumber)) };
}

// ————————————————————————————————————————————————————————————————————————————————
// ↓↓↓↓↓↓↓↓↓↓ 常数 ↓↓↓↓↓↓↓↓↓↓
const MOCK_SERVER_NUMBER = 10;  // 模拟缓存服务器数量
const MOCK_DATA_NUMBER = 1000000;  // 模拟数据数量
const DEBUG = false;
// ↑↑↑↑↑↑↑↑↑↑ 常数 ↑↑↑↑↑↑↑↑↑↑
// ————————————————————————————————————————————————————————————————————————————————

// ————————————————————————————————————————————————————————————————————————————————
// ↓↓↓↓↓↓↓↓↓↓ 生成模拟数据 ↓↓↓↓↓↓↓↓↓↓
const { mock } = require('./mock');
const { serversConfig, data } = mock({ mockServerNum: MOCK_SERVER_NUMBER, mockDataNumber: MOCK_DATA_NUMBER });
// ↑↑↑↑↑↑↑↑↑↑ 生成模拟数据 ↑↑↑↑↑↑↑↑↑↑
// ————————————————————————————————————————————————————————————————————————————————

// ————————————————————————————————————————————————————————————————————————————————
// ↓↓↓↓↓↓↓↓↓↓ 测试不同虚拟节点倍数下缓存服务器负载标准差 ↓↓↓↓↓↓↓↓↓↓
let result = [];
for (let i of [0, 1, 2]) {
    console.log('————————————————————————————————————————');
    console.log(`[test] 测试虚拟节点倍数 = ${i}`);
    removeServers(cacheServers);
    let { loadStdDev } = test({ serversConfig, data, virtualMultiTimes: i, debug: DEBUG });
    result.push(`[test]（虚拟节点倍数 = ${i}）缓存服务器集群负载标准差为：${loadStdDev}`);
    console.log('————————————————————————————————————————');
}
console.log('————————————————————————————————————————');
console.log(result);
console.log('————————————————————————————————————————');
// ↑↑↑↑↑↑↑↑↑↑ 测试不同虚拟节点倍数下缓存服务器负载标准差 ↑↑↑↑↑↑↑↑↑↑
// ————————————————————————————————————————————————————————————————————————————————

