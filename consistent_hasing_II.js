/*

    基于一致性哈希算法的分布式缓存

    说明：

    分布式缓存包含三个过程：
    1. 分配服务器编号
    2. 查找服务器编号
    3. 扩充服务器编号

    基于普通哈希算法的分布式缓存对上述三个过程的具体实现如下：
    1. 根据服务器数量（n）分配服务器编号
    2. 根据数据的键名（key）查找服务器编号，以进行读或写
    3. 根据扩充服务器数量（x）重新分配服务器编号，并迁移*所有*缓存

    基于一致性哈希算法的分布式缓存对上述三个过程的具体实现如下：
    1. 根据服务器配置（如 ip）分配服务器编号
    2. 根据数据的键名（key）查找服务器编号，以进行读或写
    3. 根据扩充服务器配置（如 ip）为新服务器分配编号，并迁移*部分*缓存

 */

const CACHE_SERVER_MAX_NUM = 2**32;  // 缓存服务器最大数量

const crypto = require('crypto');

const cacheServers = [];  // 缓存服务器列表
let virtualNodeNo = 0;  // 可用虚拟节点编号

class CacheServer {
    constructor({ name, ip, id, realServer, debug = false } = {}) {
        this.name = name;
        this.ip = ip;
        this.id = id;
        this.debug = debug;
        this.dataNumber = 0;
    }
    getCache(key) {
        /*具体实现略*/
        this.debug && console.debug(`[cacheServer <${this.name}>] Successfully get cache by key <${key}>`);
    }
    getAllCaches() {
        /*具体实现略*/
        this.debug && console.debug(`[cacheServer <${this.name}>] Successfully get all caches`);
    }
    setCache(key, value) {
        /*具体实现略*/
        this.dataNumber++;
        this.debug && console.debug(`[cacheServer <${this.name}>] Successfully set cache <key: ${key}, value: ${value}>`);
    }
    setCaches(caches) {
        /*具体实现略*/
        for (let { key, value } of caches) this.setCache(key, value);
    }
    removeCache(key, value) {
        /*具体实现略*/
        this.dataNumber--;
        this.debug && console.debug(`[cacheServer <${this.name}>] Successfully removed cache <key: ${key}, value: ${value}>`);
        return { key, value };
    }
    removeCaches(caches) {
        /*具体实现略*/
        let removedCaches = [];
        for (let { key, value } of caches) removedCaches.push(this.removeCache(key, value));
        return removedCaches;
    }
}

/**
 * 初始化创建缓存服务器列表
 * @param {Array} serversConfig 服务器配置对象列表
 * @param {Array} idKey 使用服务器配置对象中的哪个或哪几个键的值作为 id
 * @param {String} multiIdKeySeparator 当指定 idKey 个数大于 1 时各个值之间的分隔符
 * @param {Integer} virtualMultiTimes 虚拟节点的倍数
 * @param {Boolean} debug 调试模式
 * @returns {Array.CacheServer} 缓存服务器实例对象列表
 */
function createServers(serversConfig = [], { idKey = ['ip'], multiIdKeySeparator = '|', virtualMultiTimes = 0, debug = false } = {}) {
    serversConfig = Array.isArray(serversConfig) ? serversConfig : [String(serversConfig)];
    idKey = Array.isArray(idKey) ? idKey : [String(idKey)];
    multiIdKeySeparator = multiIdKeySeparator || '';
    let newServers = [];
    // 根据配置实例化缓存服务器并编号
    for (let serverConfig of serversConfig) {
        // 创建真实服务器节点
        let serverId = idKey.map(k => serverConfig[k]).join(multiIdKeySeparator);  // idKey 通常不会很多，所以此方法对整体性能没有明显影响
        let serverIdHash = getHashMod(serverId);
        let server = new CacheServer({ ...serverConfig, id: serverIdHash, debug });
        cacheServers.push(server);
        newServers.push(server);
        debug && console.debug(`Successfully assigned id <${server.id}> to server <${server.name}>`);
        // 创建虚拟服务器节点（TODO：可优化）
        for (let i = 0; i < virtualMultiTimes; i++) {
            let virtualServerId = `${++virtualNodeNo}@${serverId}`;
            let virtualServerIdHash = getHashMod(virtualServerId);
            let virtualServer = { isVirtual: true, id: virtualServerIdHash, realServer: server };
            // let virtualServer = new CacheServer({ ...serverConfig, id: virtualServerIdHash, realServer: server, debug });
            cacheServers.push(virtualServer);
            newServers.push(virtualServer);
            debug && console.debug(`Successfully assigned id <${virtualServer.id}> to virtualServer <${virtualServer.name}>`);
        }
    }
    // 对服务器列表升序排序，便于直接遍历查找
    cacheServers.sort((sa, sb) => sa.id - sb.id);
    return newServers;
}

/**
 * 获取指定数据键名对应的缓存服务器
 * @param dataKey 数据键名
 * @param keyIsHash 提供的 dataKey 是否已经是 hash 值
 * @param reverse 是否逆向查找
 * @param acceptVirtual 是否接受虚拟节点（测试用，实际无用）
 * @returns {CacheServer|undefined} 缓存服务器实例对象
 */
function getServer(dataKey, { keyIsHash = false, reverse = false, acceptVirtual = false } = {}) {
    let keyHash = getHashMod(dataKey);
    let server = keyHash && ((
        reverse ?
            (() => { for (let server of cacheServers) { if (server.id <= keyHash) return server; } })()
            :
            (() => { for (let server of cacheServers) { if (server.id >= keyHash) return server; } })()
    ) || cacheServers[0]);  // 环形查找（边界情况：没找到则返回 undefined）
    return acceptVirtual ? server : server && (server.isVirtual ? server.realServer : server);
}

/**
 * 增加缓存服务器
 * @param {Array} newServersConfig 服务器配置对象列表
 * @param {Array} idKey 使用服务器配置对象中的哪个或哪几个键的值作为 id
 * @param {String} multiIdKeySeparator 当指定 idKey 个数大于 1 时各个值之间的分隔符
 * @param {Integer} virtualMultiTimes 虚拟节点的倍数
 * @param {Boolean} debug 调试模式
 * @returns {Array.CacheServer} 增加后的缓存服务器实例对象列表
 */
function addServers(newServersConfig = [], { idKey = ['ip'], multiIdKeySeparator = '|', virtualMultiTimes = 0, debug = false } = {}) {
    let newCacheServers = createServers(newServersConfig, { idKey, multiIdKeySeparator, virtualMultiTimes, debug });
    // 从编号最小的新服务器开始迁入相应缓存数据，避免重复迁移
    newCacheServers.sort((sa, sb) => sa.id - sb.id);
    for (let cacheMoveTo of newCacheServers) {
        // 环上逆时针最靠近的一台服务器缓存迁移到这台新的服务器（边界情况：如果没有找到就不用迁移）
        let cacheMoveFrom = getServer(cacheMoveTo.id, { idIsHash: true, reverse: true });
        cacheMoveFrom && cacheMoveTo.setCaches(cacheMoveFrom.removeCaches(cacheMoveFrom.getAllCaches()));
        cacheServers.push(cacheMoveTo);
    }
    return cacheServers;
}

/**
 * 移除缓存服务器
 * @param servers 缓存服务器实例
 */
function removeServers(servers = []) {
    let serversIdMap = {};
    for (let { id } of servers) serversIdMap[id] = true;
    for (let i = 0; i < cacheServers.length;) {
        if(serversIdMap[cacheServers[i].id]) cacheServers.splice(i, 1);
        else i++;
    }
}

/**
 * 获得数据的哈希值模服务器最大数量
 * @param data 数据
 * @returns {(number|undefined)} 哈希值模服务器最大数量
 */
function getHashMod(data) {
    return data && crypto.createHash('md5').update(data).digest('dec').readUInt32BE() % CACHE_SERVER_MAX_NUM;
}

module.exports = {
    cacheServers,
    createServers,
    getServer,
    addServers,
    removeServers,
    getHashMod,
};
