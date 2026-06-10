// ============================================================
// Stub Template - 复制此文件并改名为你的模块路径
// Owner: {你的 Agent 编号} - {你的任务名}
// ============================================================
// 用法:
//   1. cp STUB_TEMPLATE.js src/<category>/<name>.js
//   2. 改 Owner 注释
//   3. 实现 init() 和 destroy()
//   4. 提交 PR 标题: [A{xx}] xxx
//
// 你的模块应该:
//   - 挂在 window.SM.modules.{category}.{name}（app.js 会自动挂）
//   - 实现 init() 和 destroy()
//   - init() 里只读 window.SM，不 emit 事件
//   - 业务模块之间只通过 SM.bus 通信
//
// 详细接口: docs/INTERFACES.md §6.X
// 任务详情: docs/AGENT_PROMPTS.md#a{xx}

console.log('[stub] {module path} loaded - replace with real implementation');

export function init() {
  // TODO: 实现 init
  // 1. 读取 window.SM 上的输入数据
  // 2. 创建 DOM / Three.js 对象
  // 3. SM.bus.on(...) 订阅事件
  // 注意: 不要在 init 里 emit 事件
}

export function destroy() {
  // TODO: 实现 destroy
  // 1. SM.bus.off(...) 解绑所有订阅
  // 2. 释放 Three.js 资源（geometry / material / texture）
  // 3. 移除 DOM 监听
  // 4. 清空 SM 上你负责的字段
}
