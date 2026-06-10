# INTERFACES.md

> **球形镜像 · 碎镜成忆** — 模块接口契约
> **版本**: 1.0.0
> **冻结时间**: Day 1 13:00
> **所有人遵守**: 所有 Agent 必须按本文件实现，禁止私下改接口
> **变更流程**: PR 提交到 `docs/INTERFACES.md` → @A0-整合长批准 → 全员重发

---

## 0. 阅读顺序

1. 先读 §1 全局对象、`window.SM` 的形状
2. 再读 §2 事件总线（模块间**唯一**通信方式）
3. 再读 §3 状态机（5 态 + 转换条件）
4. 再读 §4 输入层（鼠标/触摸统一）
5. 最后按你的 Agent 编号读 §6 对应小节

---

## 1. 全局对象 `window.SM`

**唯一定义点**：`src/core/app.js`
**加载顺序**：在 `index.html` 顶部同步加载（`type="module"` 之前）

```js
window.SM = {
  // 元信息
  version: '1.0.0',
  debug: true,           // 调试模式开关
  startTime: Date.now(),

  // 全局状态
  state: 'cover',        // 当前态，见 §3
  prevState: null,       // 上一个态（用于返回/重置）

  // 业务数据
  materials: [],         // 已加载素材数组：[{id, type, url, w, h, isPanorama}, ...]
  shards: [],            // 碎片实例数组（由 A6 创建）
  activeShardId: null,   // 当前放大显示的碎片 id
  sphereRotation: { x: 0, y: 0 },  // 球体累积旋转（四元数也行，但用欧拉便于调试）

  // 渲染模式
  renderMode: '3d',      // '3d' | '2d'，由 A10 根据 WebGL 支持自动设定
  webglOK: true,         // WebGL 检测结果

  // 模块挂载点（每个模块 init 后必须把自己挂上来）
  modules: {},

  // 核心子系统
  bus: null,             // §2 事件总线实例
  input: null,           // §4 输入层实例
};
```

**约定**：
- 任何模块**只能读** `SM` 上的字段（除了自己负责的字段）
- 改状态必须通过 `SM.go(newState)`（见 §3）
- 跨模块数据传递走 `bus` 事件 payload，**不要直接改别人的字段**

---

## 2. 事件总线 `SM.bus`

**唯一定义点**：`src/core/event-bus.js`

```js
// API
SM.bus.on(eventName, handler)     // 订阅，handler 签名: (payload) => void
SM.bus.off(eventName, handler)    // 取消订阅（防止内存泄漏）
SM.bus.emit(eventName, payload)   // 广播，payload 可以是任意可序列化对象
SM.bus.once(eventName, handler)   // 一次性订阅

// 示例
SM.bus.on('shard:tap', ({ shardId }) => {
  SM.modules.render3d.panoramaBind.swapTo(shardId);
});
```

**事件命名规范**：`{模块}:{动作}`，全部小写、连字符分隔
**禁止**：用 `click`/`tap` 这类通用名；必须带模块前缀防止冲突

**完整事件清单**（任何人要 emit 新事件必须先在 §7 注册）见文件末尾 §7。

---

## 3. 状态机 `SM.state`

**唯一定义点**：`src/core/state-machine.js`
**5 态**：

| 状态 | 含义 | 出口触发 |
|---|---|---|
| `cover` | 封面页 | 用户点击中央镜 → `mirror` |
| `mirror` | 镜面 + 预加载 | 第 3 次点击完成 → `cracking` |
| `cracking` | 炸裂 + 聚合动画中 | 聚合完成 → `sphere` |
| `sphere` | 完整球体可交互 | 用户点重置 → `cover` |
| `share` | 截图/分享弹层 | 关闭 → `sphere` |

**API**：

```js
SM.go(newState, payload?)  // 切换状态，自动 emit 'state:before-change' 和 'state:change'
SM.canGo(newState)         // 检查转移是否合法（防止越权跳转）
SM.onStateChange(cb)       // 订阅，等价 bus.on('state:change', cb)
```

**合法转移图**：
```
cover ──→ mirror ──→ cracking ──→ sphere ⇄ share
  ↑                                  │
  └──────────────────────────────────┘  (重置)
```

**每个态的"进入钩子"**（在 `state:change` 后被各模块监听执行）：

| 态 | 必触发 |
|---|---|
| `cover` | `ui.cover` 渲染；`audio.soundFx` 播放 ambient |
| `mirror` | `ui.mirror` 渲染；`upload.materialRouter` 启动（如果还没跑） |
| `cracking` | `anim.mirrorCrack.stage(3)` 启动 |
| `sphere` | `anim.aggregate.play()` → 完成后 emit `sphere:ready` |
| `share` | `output.screenshot.take()` 自动触发（如果没点按钮） |

---

## 4. 输入层 `SM.input`

**唯一定义点**：`src/input/unified-input.js`
**监听目标**：`document.body`（full-screen）
**输出事件**（内部用 bus 转发）：

```js
SM.bus.on('input:tap',       ({ x, y, target }) => { /* ... */ });
SM.bus.on('input:drag-start',({ x, y, target }) => { /* ... */ });
SM.bus.on('input:drag',      ({ x, y, dx, dy, target }) => { /* ... */ });
SM.bus.on('input:drag-end',  ({ x, y, target }) => { /* ... */ });
SM.bus.on('input:pinch',     ({ scale, target }) => { /* ... */ });  // 移动端缩放
```

**target 取值**：`'cover'` | `'mirror'` | `'sphere'` | `'shard'` | `'hud-btn'` | `'background'`
（具体由各 UI 模块通过 `SM.input.bindTarget(el, targetName)` 注册）

**禁止**：业务模块自己监听 `mousedown`/`touchstart`（会冲突）

---

## 5. 模块挂载约定

**位置**：`window.SM.modules.{category}.{name}`
**生命周期**：
```js
window.SM.modules = {
  render3d: { scene: { init, ... }, sphereShell: { ... }, ... },
  render2d: { fallback: { ... } },
  anim:     { mirrorCrack: { ... }, aggregate: { ... }, ... },
  ui:       { cover: { ... }, mirror: { ... }, hud: { ... } },
  upload:   { filePicker: { ... }, materialRouter: { ... } },
  output:   { screenshot: { ... }, share: { ... } },
  audio:    { soundFx: { ... } },
  demo:     { mode: { ... } },
};
```

**每个模块必须实现**：

```js
SM.modules.{category}.{name} = {
  // 必须：模块挂载即调用
  init() {
    // 1. 读取 SM 上的输入
    // 2. 创建 DOM / Three.js 对象
    // 3. bus.on(...) 订阅事件
    // 4. 不要在 init 里 emit 任何事件
  },

  // 必须：模块销毁时调用（用于 SPA 切换或重置）
  destroy() {
    // 解绑所有 bus.on 的事件
    // 释放 Three.js 资源（geometry / material / texture）
    // 移除 DOM 监听
  },
};
```

**init 顺序**（由 `app.js` 强制）：
```
scene → sphereShell → shardMesh → shardSeam → panoramaBind
  ↓
filePicker → materialRouter
  ↓
mirrorCrack → aggregate → shardRotate → shardInteract
  ↓
cover → mirror → hud
  ↓
screenshot → share
  ↓
soundFx
  ↓
fallback (只在 SM.renderMode === '2d' 时 init)
  ↓
demo.mode (最后)
```

---

## 6. 各模块接口契约

> **每个 Agent 只看自己那一节。** 不在下面列表里的方法/字段 = 私有，不要依赖。

### 6.1 `render3d.scene` — A4

```js
SM.modules.render3d.scene = {
  init() {},

  // 获取渲染器（被 screenshot 调）
  getRenderer(): THREE.WebGLRenderer,

  // 获取相机（debug 用）
  getCamera(): THREE.PerspectiveCamera,

  // 性能自适应：fps < 30 时自动降级
  setQuality(level: 'high' | 'low'),  // level='low' 切到2D或减面

  // resize
  onResize(),
};
```

### 6.2 `render3d.sphereShell` — A5

```js
SM.modules.render3d.sphereShell = {
  init(),

  // 加载一张全景图贴到球面上
  // isPanorama=true: equirectangular UV 贴图
  // isPanorama=false: 居中裁剪成 2:1 再贴（伪全景）
  setTexture(url: string, isPanorama: boolean): Promise<void>,

  // 球体缩放/隐藏
  setVisible(v: boolean),
  setScale(s: number),
};
```

### 6.3 `render3d.shardMesh` — A6

```js
SM.modules.render3d.shardMesh = {
  init(),

  // 从预生成拓扑创建 N 片碎片
  // topology: 预生成的 Voronoi 划分（demo 阶段硬编码 6 片）
  createFromTopology(topology: ShardTopology): Shard[],

  // 动画：碎片从当前位置"炸开"
  explode(duration: number = 600): Promise<void>,

  // 动画：碎片聚合到球体位置
  aggregate(duration: number = 1200): Promise<void>,

  // 旋转累积
  rotateBy(dx: number, dy: number),
  rotateTo(x: number, y: number),

  // 状态
  getShards(): Shard[],
  getShardById(id: string): Shard,
};

// Shard 数据结构
type Shard = {
  id: string,             // 'shard-0' ~ 'shard-5'
  mesh: THREE.Mesh,
  material: THREE.Material,
  uvRegion: { u0, v0, u1, v1 },  // 在球面纹理上的 UV 区域
  index: number,          // 0-based
};
```

### 6.4 `render3d.shardSeam` — A7

```js
SM.modules.render3d.shardSeam = {
  init(),

  // 启用/禁用发光描边
  setEnabled(v: boolean),

  // 切换颜色（可选，demo 阶段可固定一种）
  setColor(hex: string),
};
```

### 6.5 `render3d.panoramaBind` — A8

```js
SM.modules.render3d.panoramaBind = {
  init(),

  // 绑定 N 张素材到 N 个碎片
  bind(materials: Material[], shards: Shard[]): Promise<void>,

  // 切到指定碎片的视角
  swapTo(shardId: string, animate: boolean = true): Promise<void>,

  // 释放当前 zoom-in，回到完整球体
  resetView(animate: boolean = true): Promise<void>,
};
```

### 6.6 `render2d.fallback` — A9

```js
SM.modules.render2d.fallback = {
  init(),

  // 用 6 张图贴到立方体面，做伪 3D
  setMaterials(materials: Material[]): Promise<void>,

  rotateBy(dx: number, dy: number),
};
```

### 6.7 `anim.mirrorCrack` — A13

```js
SM.modules.anim.mirrorCrack = {
  init(),

  // 推进裂纹阶段
  // stage=1: 中心冲击点
  // stage=2: 裂纹扩散
  // stage=3: 炸裂（完成后自动 emit 'crack:explode'，A14 监听）
  stage(n: 1 | 2 | 3): Promise<void>,

  // 重置回 stage 0
  reset(),
};
```

### 6.8 `anim.aggregate` — A14

```js
SM.modules.anim.aggregate = {
  init(),

  // 播放聚合动画；完成后 emit 'aggregate:done'
  play(duration?: number): Promise<void>,
};
```

### 6.9 `anim.shardRotate` — A15

```js
SM.modules.anim.shardRotate = {
  init(),
  // 内部监听 input:drag，无需外部调用
  enable(),
  disable(),
};
```

### 6.10 `anim.shardInteract` — A16

```js
SM.modules.anim.shardInteract = {
  init(),

  // 内部 raycast 监听 shard:tap
  // 触发时 emit 'shard:tap' { shardId }
  // 同时调用 panoramaBind.swapTo
};
```

### 6.11 `ui.cover` — A11

```js
SM.modules.ui.cover = {
  init(),
  show(),     // 切到 cover 态时调用
  hide(),
};
```

### 6.12 `ui.mirror` — A12

```js
SM.modules.ui.mirror = {
  init(),

  // 切到 mirror 态时调用
  show(),

  // 设置预加载进度 0~1
  setProgress(p: number),

  hide(),
};
```

### 6.13 `ui.hud` — A22

```js
SM.modules.ui.hud = {
  init(),

  // 显示/隐藏按钮组
  show(),    // sphere 态显示
  hide(),    // 其他态隐藏

  // 更新按钮状态（如截图 loading）
  setButtonState(btn: 'screenshot' | 'share' | 'reset', state: 'idle' | 'loading' | 'done' | 'error'),
};
```

### 6.14 `upload.filePicker` — A18

```js
SM.modules.upload.filePicker = {
  init(),

  // 弹出文件选择
  openPicker(): void,

  // 接受拖拽文件
  acceptDrop(files: FileList): void,

  // 当文件被选定后 emit 'files:selected' { files: File[] }
};
```

### 6.15 `upload.materialRouter` — A19

```js
SM.modules.upload.materialRouter = {
  init(),

  // 处理一组文件
  // 返回 Promise<Material[]>
  // 完成后 emit 'materials:ready' { materials }
  process(files: File[]): Promise<Material[]>,

  // 获取当前已路由的素材
  getCurrent(): Material[],
};

// Material 数据结构
type Material = {
  id: string,             // uuid
  type: 'panorama' | 'normal',
  url: string,            // objectURL 或 base64
  w: number,              // 原图宽
  h: number,              // 原图高
  isPanorama: boolean,    // 宽高比 = 2:1 判为 true
};
```

### 6.16 `output.screenshot` — A20

```js
SM.modules.output.screenshot = {
  init(),

  // 截图当前画面
  // 返回 Blob，触发浏览器下载，emit 'screenshot:done' { blob, url }
  take(): Promise<Blob>,
};
```

### 6.17 `output.share` — A21

```js
SM.modules.output.share = {
  init(),

  // 分享（Web Share API → 复制链接 → 提示 三段降级）
  // 完成后 emit 'share:done' { method }
  run(blob: Blob): Promise<void>,
};
```

### 6.18 `audio.soundFx` — A17

```js
SM.modules.audio.soundFx = {
  init(),

  // 预加载所有音效
  preload(): Promise<void>,

  // 播放
  // name: 'break' | 'aggregate' | 'switch' | 'ambient'
  play(name: string, volume?: number): void,

  // 静音切换
  toggleMute(),
  setMuted(v: boolean),
};
```

### 6.19 `demo.mode` — A24

```js
SM.modules.demo.mode = {
  init(),

  // 自动演示：连续触发 cover→mirror→click×3→sphere→rotate→screenshot
  // 现场 WiFi 不稳时救命用
  start(),

  stop(),
};
```

---

## 7. 事件目录（任何新事件必须先在此注册）

### 7.1 状态相关
| 事件名 | Payload | 发起方 | 订阅方示例 |
|---|---|---|---|
| `state:before-change` | `{ from, to, payload? }` | state-machine | 日志、埋点 |
| `state:change` | `{ from, to, payload? }` | state-machine | ui.cover/show、ui.mirror/show 等 |

### 7.2 输入相关（由 SM.input 转发）
| 事件名 | Payload |
|---|---|
| `input:tap` | `{ x, y, target }` |
| `input:drag-start` | `{ x, y, target }` |
| `input:drag` | `{ x, y, dx, dy, target }` |
| `input:drag-end` | `{ x, y, target }` |
| `input:pinch` | `{ scale, target }` |

### 7.3 资源相关
| 事件名 | Payload | 发起方 | 订阅方 |
|---|---|---|---|
| `files:selected` | `{ files: File[] }` | upload.filePicker | upload.materialRouter |
| `materials:ready` | `{ materials: Material[] }` | upload.materialRouter | render3d.panoramaBind, render2d.fallback |

### 7.4 3D 渲染相关
| 事件名 | Payload | 发起方 | 订阅方 |
|---|---|---|---|
| `scene:ready` | `{}` | render3d.scene | app |
| `sphere:ready` | `{}` | render3d.panoramaBind | anim.aggregate（自动播放） |
| `shard:tap` | `{ shardId }` | anim.shardInteract | render3d.panoramaBind, audio.soundFx |
| `shard:rotate` | `{ x, y }` | anim.shardRotate | （无，纯转发） |
| `render:mode-change` | `{ mode: '3d' \| '2d' }` | app | 所有渲染相关模块 |

### 7.5 动效相关
| 事件名 | Payload | 发起方 | 订阅方 |
|---|---|---|---|
| `crack:stage-1` | `{}` | anim.mirrorCrack | audio.soundFx |
| `crack:stage-2` | `{}` | anim.mirrorCrack | audio.soundFx |
| `crack:explode` | `{}` | anim.mirrorCrack | anim.aggregate, audio.soundFx |
| `aggregate:done` | `{}` | anim.aggregate | state-machine（go sphere） |

### 7.6 输出相关
| 事件名 | Payload | 发起方 | 订阅方 |
|---|---|---|---|
| `screenshot:done` | `{ blob, url }` | output.screenshot | ui.hud（更新按钮） |
| `screenshot:error` | `{ error }` | output.screenshot | ui.hud |
| `share:done` | `{ method }` | output.share | ui.hud |
| `share:error` | `{ error }` | output.share | ui.hud |

### 7.7 演示相关
| 事件名 | Payload | 发起方 | 订阅方 |
|---|---|---|---|
| `demo:start` | `{}` | demo.mode | state-machine |
| `demo:stop` | `{}` | demo.mode | state-machine |

---

## 8. 错误码与降级策略

| 错误场景 | 处理方 | 降级行为 |
|---|---|---|
| WebGL 不支持 | A10 | `SM.renderMode = '2d'`，隐藏 3D 入口，启用 A9 兜底 |
| 素材加载失败 | A5/A8 | 该碎片显示灰色占位，不阻塞其他碎片 |
| 音效加载失败 | A17 | 静默继续，不影响视觉 |
| 截图失败（toDataURL 抛错） | A20 | 按钮变红，弹"截图失败，请重试" |
| 分享失败 | A21 | 降级为"复制到剪贴板"，再降级为"显示 base64 让用户手动复制" |
| Voronoi 拓扑生成失败 | A6 | 兜底为 6 片规则楔形（6 等分经线） |

---

## 9. 关键约束（不可违反）

1. **业务模块之间不能互相 import**，只能通过 `SM.bus` 通信
2. **基础模块**（state-machine / event-bus / unified-input）可被任何模块 import
3. 任何模块**禁止**在 `init()` 里 emit 事件
4. 任何模块**必须**实现 `destroy()`，重置时统一调用
5. `window.SM` 的字段除 `modules` 外**只读**
6. 改 `state` 必须走 `SM.go()`，不要直接赋值
7. 所有资源（geometry / material / texture）必须可释放，否则重置 3 次后 OOM

---

## 10. 版本日志

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0.0 | Day 1 09:00 | 初版冻结 |
