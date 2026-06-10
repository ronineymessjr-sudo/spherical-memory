# 球形镜像 · 碎镜成忆

> 2 天黑客松项目 — 把旅行/日常回忆碎成一颗可旋转的全景记忆球

**项目代号**：spherical-memory
**目标平台**：H5（PC 浏览器 + 移动端浏览器）
**技术栈**：Three.js + 原生 JS（ES Modules）+ CSS3
**评分维度**：交互流畅度 × 创意记忆点 × 演示完整度

---

## 目录

1. [这是什么](#1-这是什么)
2. [5 分钟上手](#2-5-分钟上手)
3. [项目结构](#3-项目结构)
4. [架构核心概念](#4-架构核心概念)
5. [开发流程](#5-开发流程)
6. [调试技巧](#6-调试技巧)
7. [演示 URL 参数](#7-演示-url-参数)
8. [关键文档](#8-关键文档)
9. [团队分工](#9-团队分工)
10. [2 天时间线](#10-2-天时间线)
11. [应急 FAQ](#11-应急-faq)

---

## 1. 这是什么

把用户上传的旅行照片/全景图，碎成 6 块独立的"记忆碎片"，聚合为一个可旋转的 3D 球体。每一块碎片承载一段回忆，可以点击切换视角。

**5 态流程**：
```
cover 封面  →  mirror 镜面  →  cracking 炸裂  →  sphere 球体  →  share 分享
   ↑                                                              │
   └──────────────────────────────────────────────────────────────┘
                              (重置)
```

**关键操作路径**：
- 点封面 → 切到镜面
- 点镜面 3 次 → 碎裂 → 聚合为球体
- 拖拽球体 → 旋转
- 点击碎片 → 切视角
- 截图按钮 → 保存 / 分享

---

## 2. 5 分钟上手

### 2.1 克隆与启动

```bash
git clone <repo-url> spherical-memory
cd spherical-memory

# 启动本地服务器（任选其一）
python3 -m http.server 8080      # Python 3
npx serve .                      # Node.js
npx http-server -p 8080          # Node.js 备选
```

### 2.2 打开浏览器

```
http://localhost:8080
```

### 2.3 预期看到

- **画面**：黑屏（这是正常的，业务模块还没实现）
- **DevTools Console**：
  ```
  [SM] 球形镜像 v1.0.0
  [SM] render mode: 3d
  [SM] ✗ render3d.scene (not ready): ...   ← 正常
  [SM] ✗ render3d.sphereShell (not ready): ...   ← 正常
  ...（约 18 行 not ready）
  [SM] ready   ← 这个必须出现
  ```

只要看到最后的 `[SM] ready` 就说明基础设施 OK。

### 2.4 试一下 URL 参数

| URL | 效果 |
|---|---|
| `?debug=true` | console 可用 `SM.go('sphere')` 跳态 |
| `?autoclick=3` | 自动点 3 次镜子（适合快速验证） |
| `?demo=1` | 启动自动演示（A24 实现后可用） |

---

## 3. 项目结构

```
spherical-memory/
├── index.html                       # 主入口（5 态容器 + importmap）
├── README.md                        # 本文件
├── .gitignore
├── STUB_TEMPLATE.js                 # Agent 用 stub 模板
│
├── docs/
│   ├── INTERFACES.md                # 接口契约（必读）
│   ├── AGENT_PROMPTS.md             # 27 个 Agent 任务卡
│   ├── WORKFLOW.md                  # 工作流 + QA 轮转
│   └── DAY_0_CHECKLIST.md           # 今晚 + 明早 checklist
│
├── src/
│   ├── core/                        # 基础设施（Day 1 上午冻结）
│   │   ├── app.js                   # 主控（init 顺序、URL 参数）
│   │   ├── event-bus.js             # 事件总线
│   │   └── state-machine.js         # 5 态机
│   │
│   ├── input/
│   │   └── unified-input.js         # 鼠标/触摸统一
│   │
│   ├── render3d/                    # 3D 渲染（Three.js）
│   │   ├── scene.js                 # A4 场景
│   │   ├── sphere-shell.js          # A5 球壳
│   │   ├── shard-mesh.js            # A6 碎片
│   │   ├── shard-seam.js            # A7 接缝
│   │   └── panorama-bind.js         # A8 绑定
│   │
│   ├── render2d/                    # 2D 兜底
│   │   └── fallback.js              # A9
│   │
│   ├── anim/                        # 动效
│   │   ├── mirror-crack.js          # A13 裂纹
│   │   ├── aggregate.js             # A14 聚合
│   │   ├── shard-rotate.js          # A15 旋转
│   │   └── shard-interact.js        # A16 交互
│   │
│   ├── ui/                          # 界面
│   │   ├── cover.js                 # A11 封面
│   │   ├── mirror.js                # A12 镜面
│   │   └── hud.js                   # A22 HUD
│   │
│   ├── upload/                      # 上传
│   │   ├── file-picker.js           # A18
│   │   └── material-router.js       # A19
│   │
│   ├── output/                      # 输出
│   │   ├── screenshot.js            # A20
│   │   └── share.js                 # A21
│   │
│   ├── audio/                       # 音效
│   │   └── sound-fx.js              # A17
│   │
│   ├── demo/                        # 演示
│   │   └── mode.js                  # A24
│   │
│   └── styles/                      # 样式
│       ├── base.css
│       └── mobile.css
│
└── assets/                          # 资源
    ├── audio/                       # 音效文件
    └── fallback/                    # 预置全景图
```

---

## 4. 架构核心概念

### 4.1 单一真相源：`window.SM`

整个项目所有状态都在 `window.SM` 上，**唯一**全局对象。

```js
SM = {
  version: '1.0.0',
  state: 'cover',            // 当前态
  prevState: null,           // 上一个态
  materials: [],             // 已加载素材
  shards: [],                // 碎片实例
  renderMode: '3d',          // '3d' | '2d'
  modules: {                 // 所有挂载的模块
    render3d: { scene: {...}, sphereShell: {...}, ... },
    anim: { mirrorCrack: {...}, ... },
    ...
  },
  bus: <EventBus>,           // 事件总线实例
  input: <UnifiedInput>,     // 输入层实例
  state: <StateMachine>,     // 状态机实例
}
```

**约定**：
- 业务模块只**读** SM，不直接改
- 改状态走 `SM.go(newState)`，不要直接赋值
- 跨模块数据走 `SM.bus` 事件，**禁止互相 import**

### 4.2 模块间通信：`SM.bus`

```js
// 订阅
SM.bus.on('shard:tap', ({ shardId }) => {
  console.log('用户点击了碎片', shardId);
});

// 触发
SM.bus.emit('shard:tap', { shardId: 'shard-3' });

// 一次性订阅
SM.bus.once('sphere:ready', () => {
  console.log('球体就绪');
});

// 取消订阅
const off = SM.bus.on('xxx', handler);
off();  // 解绑
```

**事件命名规范**：`{模块}:{动作}`，全部小写、连字符分隔
**完整事件清单**：[INTERFACES.md §7](INTERFACES.md)

### 4.3 状态机：5 态切换

```js
SM.go('mirror');           // cover → mirror
SM.go('cracking');         // mirror → cracking
SM.go('sphere');           // cracking → sphere
SM.state.canGo('share');   // 检查是否合法
SM.state.onStateChange(({ from, to }) => {
  console.log(`${from} → ${to}`);
});
```

**合法转移图**：
```
cover ──→ mirror ──→ cracking ──→ sphere ⇄ share
  ↑                                  │
  └──────────────────────────────────┘  (重置)
```

### 4.4 模块挂载约定

**位置**：`window.SM.modules.{category}.{name}`
**结构**：
```js
// src/render3d/scene.js
export function init() {
  // 1. 读 window.SM
  // 2. 创建 Three.js 对象
  // 3. SM.bus.on(...) 订阅事件
  // 注意: 不要在 init 里 emit 事件
}

export function destroy() {
  // 解绑 + 释放资源
}
```

**app.js 会自动调用**：
```js
const mod = await import('./scene.js');
SM.modules.render3d.scene = mod;
mod.init();
```

### 4.5 完整模块示例

```js
// src/anim/shard-rotate.js
import * as THREE from 'three';

let sphereGroup = null;
let inertia = 0.95;

export function init() {
  // 1. 拿到场景
  sphereGroup = SM.modules.render3d.shardMesh.getGroup();

  // 2. 订阅拖拽事件
  SM.bus.on('input:drag', ({ dx, dy, target }) => {
    if (target !== 'sphere' && target !== 'shard') return;
    sphereGroup.rotation.y += dx * 0.01;
    sphereGroup.rotation.x += dy * 0.01;
  });
}

export function destroy() {
  sphereGroup = null;
}
```

---

## 5. 开发流程

### 5.1 每个 Agent 的工作流

```
1. 读 AGENT_PROMPTS.md 你的那一节（5 min）
       ↓
2. 读 INTERFACES.md 对应模块的接口（10 min）
       ↓
3. 从 STUB_TEMPLATE.js 复制创建你的模块文件
       ↓
4. 实现 init() 和 destroy()
       ↓
5. 本地验证：
   - python3 -m http.server 8080
   - 打开 ?debug=true
   - console 测试相关事件
       ↓
6. 提交 PR：
   git checkout -b agent/A{id}-{name}
   git add .
   git commit -m "[A{id}] xxx"
   git push origin agent/A{id}-{name}
   # 在 GitHub 开 PR，@ A0-整合长 + 对应 QA
       ↓
7. 等待 review（10-30 min）
       ↓
8. 通过后 A0 合入
```

### 5.2 分支命名

| 类型 | 格式 | 示例 |
|---|---|---|
| 业务模块 | `agent/A{id}-{name}` | `agent/A4-scene` |
| 紧急修复 | `fix/{description}` | `fix/sphere-leak` |
| QA 验证 | `qa/{date}` | `qa/0615` |

### 5.3 Commit 规范

```
[A{id}] 一句话描述

可选详情（不超过 3 行）
```

例：
```
[A4] 初始化 Three.js 场景 + 相机 + 灯光

球体位置 (0,0,0)，相机 z=5，FPS 监控
```

### 5.4 PR 流程

```
提 PR → QA-1 审接口（10 min）
      → 领域 QA 审质量（30 min）
      → A0 合入到 main
      → 15:00 / 17:00 / 19:00 三个合入窗口
```

**每个 PR 应包含**：
- 自测通过（本地能跑）
- 截图或录屏（动效类必须有）
- console 无 error / warning

---

## 6. 调试技巧

### 6.1 URL 参数

| 参数 | 用途 |
|---|---|
| `?debug=true` | 启用调试模式（console 可用 `SM.go('xxx')`） |
| `?autoclick=3` | 自动点 3 次镜子（最快看动效） |
| `?demo=1` | 启动自动演示 |

### 6.2 Console 调试命令

```js
// 跳到任意态
SM.go('sphere');

// 手动 emit 事件
SM.bus.emit('sphere:ready');

// 查看事件订阅数
SM.bus.listenerCount('input:tap');

// 查看模块
SM.modules;

// 查看全局状态
console.table(SM);

// 看 fps
SM.modules.render3d.scene.getRenderer().info.render;
```

### 6.3 常见错误

| 错误 | 原因 | 解决 |
|---|---|---|
| `Illegal transition: cover → sphere` | 状态机不允许 | 走中间态：`cover → mirror → cracking → sphere` |
| `Cannot read properties of undefined` | 模块还没加载 | 等 `[SM] ready` 后再访问 |
| `WebGL: INVALID_OPERATION` | Three.js 资源未释放 | 检查 destroy() |
| 黑屏无输出 | 模块加载失败 | 看 console 的红色错误 |
| 拖拽无反应 | 没注册 `bindTarget` | 业务模块需 `SM.input.bindTarget(el, 'xxx')` |

### 6.4 性能调试

Chrome DevTools → Performance → 录制 5s，查看：
- FPS 应 ≥ 30
- 主线程不应有长任务（> 50ms）
- GPU 占用不应持续 > 80%

---

## 7. 演示 URL 参数

| URL | 用途 | 何时用 |
|---|---|---|
| `?debug=true` | 跳态调试 | 开发时 |
| `?autoclick=3` | 跳过手动点击 | 快速验证动效 |
| `?demo=1` | 完整自动演示 | **现场演示救命** |
| `?debug=true&autoclick=3` | 调试 + 自动点击 | QA 测试 |

**现场翻车应急顺序**：
1. 刷新 + `?demo=1`（自动演示）
2. 录屏兜底（assets/demo-backup.mp4）
3. `?debug=true` + 手动跳态应急

---

## 8. 关键文档

| 文档 | 何时读 | 内容 |
|---|---|---|
| [README.md](README.md) | **第 1 步** | 项目总览 + 5 分钟上手 |
| [INTERFACES.md](docs/INTERFACES.md) | **第 2 步** | 接口契约，**所有 Agent 必读** |
| [AGENT_PROMPTS.md](docs/AGENT_PROMPTS.md) | **第 3 步** | 你对应 Agent 的任务卡 |
| [WORKFLOW.md](docs/WORKFLOW.md) | 第 4 步 | 流程 + QA 轮转 |
| [DAY_0_CHECKLIST.md](docs/DAY_0_CHECKLIST.md) | **今晚必看** | 准备清单 |
| [STUB_TEMPLATE.js](STUB_TEMPLATE.js) | 开始编码时 | 模块文件模板 |

---

## 9. 团队分工

### 9.1 角色

| 角色 | 人数 | 职责 |
|---|---|---|
| **A0 整合长** | 1 | 总指挥、接口冻结、合入、应急 |
| **A1-A26** | 26 | 各自负责一个模块（见 AGENT_PROMPTS.md） |
| **QA-1 接口守门人** | 1 | 每个 PR 必过 |
| **QA-2 视觉与体验** | 1 | UI / 动效 / 移动端 |
| **QA-3 3D 性能** | 1 | FPS / 内存 / 加载 |
| **QA-4 集成测试** | 1 | 端到端流程 |
| **QA-5 演示就绪** | 1 | 演示场景 + 应急 |

**人手不够**：QA-3 和 QA-4 可合并为同一人。

### 9.2 QA 轮转表

```
QA-1（接口）:  所有 PR 必过，**不轮转**
QA-2（视觉）:  A1, A11, A12, A13, A14, A22, A26
QA-3（3D）:    A4, A5, A6, A7, A8, A9, A15, A16
QA-4（集成）:  A2, A3, A18, A19, A20, A21
QA-5（演示）:  A23, A24, A25
```

每 4 小时可调一次，详见 [WORKFLOW.md §3.2](docs/WORKFLOW.md)。

### 9.3 沟通渠道

- **主频道**：`#hackathon-spherical-memory`
- **阶段频道**：`#phase-0` / `#phase-1` / `#phase-2`
- **卡点求助**：`#blockers`（15 分钟无响应 @A0）
- **QA 反馈**：`#qa`

---

## 10. 2 天时间线

```
Day 1
├── 09:00 - 13:00   Phase 0   基础设施
│   ├── 09:00  A0 派发 A1-A4
│   ├── 13:00  ★ 冻结 INTERFACES.md v1.0.0 + 派发 A5-A26
│
├── 13:00 - 19:00   Phase 1   18 个 Agent 并行构建
│   ├── 15:00  第 1 次合入
│   ├── 17:00  第 2 次合入
│   ├── 19:00  第 3 次合入
│
├── 19:00 - 23:00   Phase 1.5 第一次联调
│   ├── 19:00  节点 1：QA-3 3D 性能
│   ├── 21:00  节点 2：QA-4 集成测试
│   ├── 22:00  ★ 生死线：最小可演示链路
│   └── 23:00  砍功能决策

Day 2
├── 09:00 - 12:00   Phase 2   完善
│   ├── 09:00  A24 演示模式 / A26 移动端
│   └── 10:00  节点 3：QA-4 集成测试 v2
│
├── 12:00 - 18:00   Phase 3   抛光 + 演示就绪
│   ├── 12:00  砍功能决策 v2
│   ├── 14:00  A25 录屏
│   ├── 15:00  节点 4：QA-5 演示场景
│   ├── 16:00  演练 3 轮
│   ├── 17:00  节点 5：QA-5 最终验收
│   └── 18:00  ★ 封版
```

**关键节点**：13:00 冻结接口 / 22:00 生死线 / 17:00 最终验收

---

## 11. 应急 FAQ

### Q: 卡住超过 1 小时怎么办？
A: 在 `#blockers` 写清楚：卡在哪、试过什么、卡了多久。15 分钟无响应 @A0。

### Q: 接口冲突怎么办？
A: 不要私自改接口，开 issue 描述：A0 + 2 个相关 Agent 30 分钟内评审。批准后更新 INTERFACES.md。

### Q: PR 合入冲突怎么办？
A: 强制小步合入（每 PR ≤ 100 行）。冲突时 A0 介入。

### Q: 性能不达标怎么办？
A: 6 片 → 4 片；纹理 2048 → 1024；移动端自动切 2D 兜底。

### Q: 现场演示设备翻车？
A: 顺序：刷新 + `?demo=1` → 录屏兜底 → `?debug=true` 跳态。

### Q: 我不熟悉 Three.js 怎么办？
A: 看 Three.js 官方文档（threejs.org/docs），Demo 起步最快。Day 1 上午 A4 先跑通空场景，其他人复制。

### Q: 移动端 iOS Safari 有问题？
A: 检查 `touch-action: none` / `viewport` / `env(safe-area-inset-*)`。A26 负责移动端，有问题 @TA。

### Q: 录屏怎么录？
A: Chrome DevTools → Recorder → Start。录 60s 完整流程。

### Q: 音效版权怎么办？
A: 用 freesound.org CC0 / suno.com AI 生成 / 自录。

### Q: 时间不够砍哪些功能？
A: 按优先级：
1. **必含**：cover、mirror、3 段裂纹、聚合、旋转、点击切视角、截图
2. **可选**：分享、2D 兜底、移动端深度优化、音效细节
3. **先砍**：分享（用复制图片代替）、音效、移动端深度优化

### Q: 19 个模块都没写，能直接打开页面吗？
A: 可以，会看到黑屏。`[SM] ready` 出现说明基础设施正常。业务模块报 `not ready` 是正常的。

### Q: 怎么测试我的模块不会破坏别人？
A:
1. 本地只跑自己分支：`git checkout agent/A4-scene`
2. 用 `?debug=true` 测相关事件
3. 截图发 PR 描述里

---

## 12. 写在最后

**这次黑客松的核心判断标准是「交互 + 创意」**，不是工程完整度。

- **砍功能是常态**——能跑通的核心 5 步比完美的 10 步重要 10 倍
- **性能是底线**——fps < 30 直接降级，不要硬撑
- **演示是唯一交付**——评委看到的 60s 决定一切
- **集成地狱是头号杀手**——接口冻结 + 模块解耦 + 频繁合入是唯一解药
- **轮转 QA 是保险**——4 双眼睛比 1 双强 4 倍

**祝顺利 💪**
