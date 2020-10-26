const jsf = require('json-schema-faker');
function mock({ mockServerNum, mockDataNumber }) {
    // ————————————————————————————————————————————————————————————————————————————————
    // ↓↓↓↓↓↓↓↓↓↓ 生成测试服务器配置 ↓↓↓↓↓↓↓↓↓↓
    const serversConfig = [];
    for (let i = 0; i < mockServerNum; i++) {
        serversConfig.push(Object.assign(jsf.generate({
            "type": "object",
            "properties": {
                "ip": {
                    "format": "ipv4"
                }
            },
            "required": ["ip"],
        }), { name: `缓存服务器${i + 1}号` }));
    }
    // ↑↑↑↑↑↑↑↑↑↑ 生成测试服务器配置 ↑↑↑↑↑↑↑↑↑↑
    // ————————————————————————————————————————————————————————————————————————————————

    // ————————————————————————————————————————————————————————————————————————————————
    // ↓↓↓↓↓↓↓↓↓↓ 生成测试数据 ↓↓↓↓↓↓↓↓↓↓
    const data = [];
    for (let i = 0; i < mockDataNumber; i++) {
        data.push(jsf.generate({
            "type": "object",
            "properties": {
                "key": {
                    "pattern": "^key_\\w+"
                },
                "value": {
                    "pattern": "^value_\\w+"
                }
            },
            "required": ["key", "value"]
        }));
    }
    // ↑↑↑↑↑↑↑↑↑↑ 生成测试数据 ↑↑↑↑↑↑↑↑↑↑
    // ————————————————————————————————————————————————————————————————————————————————
    return { serversConfig, data };
}

module.exports = {
    mock,
};
