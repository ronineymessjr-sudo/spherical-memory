# AGENT_PROMPTS.md

> **球形镜像 · 碎镜成忆** — 各 Agent 任务卡
> **使用方式**：复制对应 Agent 的整段内容，发送给对应的 Agent，作为它的唯一指令
> **所有 Agent 必读**：`docs/INTERFACES.md`（接口契约，版本 1.0.0）

---

## 全员通用前置

**必读文档**：
1. `docs/INTERFACES.md` — 接口契约
2. `docs/WORKFLOW.md` — 流程与时序
3. 本文件中**你对应的那一节**

**工作目录约定**：
- 仓库根：`spherical-memory/`
- 分支命名：`agent/A{id}-{name}`（如 `agent/A4-scene`）
- 提交格式：`[A{id}] {一句话描述}`
- 所有 PR 必须 @ **A0-整合长** + 对应 **TA-Interface 审核员**
- 不要直接 push 到 `main`

**Slack 频道**：`#hackathon-spherical-memory`
- `#phase-0` Day 1 上午
- `#phase-1` Day 1 下午
- `#phase-2` Day 2

**通用规则**：
- 业务模块**禁止互相 import**，只走 `SM.bus`
- 任何对 `INTERFACES.md` 的改动，先开 issue 讨论，禁止私自改接口
- 卡住超过 **1 小时**立刻在 Slack 求助，不要死磕
- 所有代码必须可运行、可演示，**半成品也提交**（标 `[WIP]`）

---

## 🔵 Group 0｜基础设施

### A0｜整合长（Orchestrator）

**你不是普通 Agent，你是这场黑客松的总指挥。**

**你的工作时间**：Day 1 09:00 → Day 2 18:00，全程在线

**核心职责**：
1. 09:00 创建仓库、起草 `INTERFACES.md` v0.1（参考本仓 `docs/INTERFACES.md`）
2. 09:30 派发 Group 0 任务（A1/A2/A3）
3. 13:00 **冻结 INTERFACES.md v1.0.0**，全员派发
4. 每 2 小时拉一次各 Agent 分支合并到 `main`
5. 处理 PR review 争议、接口冲突
6. 22:00 牵头第一次全链路联调
7. Day 2 全天做最终集成 + 演示演练

**你的工具**：
- 仓库管理员权限
- Slack 频道管理
- 应急联系：所有 Agent 都可被你直接 @

**你的产出节奏**：
```
09:00  仓库 + INTERFACES.md v0.1 + 派发 A1/A2/A3
13:00  冻结 INTERFACES.md v1.0.0 + 派发 A4~A26
15:00  第一次合入（scene + input + state）
17:00  第二次合入（首批并行 PR）
19:00  第三次合入
22:00  第一次全链路联调（必须能跑通空球+预置图+拖拽）
Day 2 06:00  全链路 + 上传 + 截图 跑通
Day 2 12:00  动效 + 音效 + 移动端 全部到位
Day 2 18:00  录屏 + 应急方案就位
```

---

### A1｜骨架工程师

**时间预算**：2h（Day 1 09:00-11:00）

**你的任务**：搭好整个项目的"空壳"，让其他 Agent 有地方填代码。

**你的交付物**：
1. `index.html` — 唯一入口，含：
   - `<div id="app">` 挂载点
   - 5 态的容器（`#cover-container`, `#mirror-container`, `#cracking-container`, `#sphere-container`, `#share-container`），全部 `display: none`
   - canvas 容器 `#webgl-canvas`（3D 用）
   - 同步加载 `src/core/event-bus.js`、`src/core/state-machine.js`、`src/input/unified-input.js`、`src/core/app.js`
   - viewport meta、title、favicon
2. `src/styles/base.css` — CSS reset + 5 态容器默认样式
3. `src/styles/mobile.css` — 移动端基础适配（先写骨架，细节 Day 2 上午 A26 完善）

**接口要求**：
- 容器 id 严格按 `INTERFACES.md §6.11-6.13` 的命名
- 加载顺序：bus → state → input → app

**验收**：
- [ ] 浏览器打开 `index.html` 无报错
- [ ] 控制台能看到 `SM` 对象
- [ ] 移动端 viewport 正常

**PR 标题**：`[A1] 骨架 + 5 态容器 + base.css`

---

### A2｜状态机 + 事件总线工程师

**时间预算**：3h（Day 1 09:00-12:00）

**你的任务**：实现 `INTERFACES.md §2` 和 `§3` 的全部内容。**这是冻结接口的最关键 Agent，所有人等你。**

**你的交付物**：
1. `src/core/event-bus.js` — 实现 `on/off/emit/once`
2. `src/core/state-machine.js` — 实现 5 态 + 合法转移检查 + `go/canGo/onStateChange`
3. `src/core/app.js` — 主控：
   - 创建 `window.SM`
   - 创建 `SM.bus = new EventBus()`
   - 创建 `SM.state = new StateMachine()`
   - **不调用任何业务模块 init**（那是 A0 合并时做的）

**接口要求**：
- 严格按 `INTERFACES.md §2 §3`
- `SM.bus` 和 `SM.state` 必须可用
- 任何 console.log 加 `SM.debug` 开关

**验收**：
```js
// 在控制台执行这段必须全部通过
SM.bus.on('test', e => console.log(e));
SM.bus.emit('test', { hi: 1 });  // 打印 {hi:1}
SM.state.go('mirror');           // 不报错
SM.state.canGo('cover');         // false（mirror→cover 不合法）
SM.state.canGo('cracking');      // true（mirror→cracking 合法）
```

**PR 标题**：`[A2] event-bus + state-machine + app.js 主控`

---

### A3｜输入层工程师

**时间预算**：3h（Day 1 09:00-12:00）

**你的任务**：把鼠标/触摸/手势统一为 5 类事件。

**你的交付物**：
1. `src/input/unified-input.js` — 实现 `INTERFACES.md §4` 的全部事件
2. `SM.input.bindTarget(el, targetName)` — 让 UI 模块注册监听区域

**关键技术点**：
- 使用 Pointer Events（兼容鼠标 + 触摸）
- 拖拽阈值：移动 5px 才算 drag
- 双指 pinch 缩放：输出 `scale`（0~N）
- `touch-action: none` 防止浏览器默认手势

**接口要求**：严格按 `INTERFACES.md §4`

**验收**：
```js
// 浏览器中点击/拖拽 canvas 后，订阅事件应触发
SM.bus.on('input:tap', e => console.log('tap', e));
SM.bus.on('input:drag', e => console.log('drag', e));
```

**PR 标题**：`[A3] unified-input 鼠标/触摸/Pinch 统一`

---

## 🟢 Group 1｜3D 渲染核心

### A4｜场景工程师（**最优先，Day 1 09:00 启动**）

**时间预算**：3h（Day 1 09:00-12:00）

**你的任务**：Three.js 场景初始化，让所有后续 3D 模块有地方跑。

**你的交付物**：
1. `src/render3d/scene.js` — 实现 `INTERFACES.md §6.1`
2. `src/render3d/loop.js` — requestAnimationFrame 循环

**关键技术点**：
- 相机：PerspectiveCamera fov=60，初始位置 (0, 0, 5)
- 灯光：AmbientLight 0.5 + DirectionalLight 0.5
- resize：监听 window.resize
- 性能自适应：FPS < 30 时 emit `scene:perf-low`

**CDN 引入 Three.js**（用 unpkg 或 jsdelivr）：
```html
<script type="importmap">
{ "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
</script>
```

**接口要求**：严格按 `INTERFACES.md §6.1`

**验收**：
- [ ] 打开页面看到黑屏（空场景）
- [ ] 控制台无报错
- [ ] 窗口缩放不卡

**PR 标题**：`[A4] Three.js 场景 + 相机 + 灯光 + 渲染循环`

---

### A5｜球壳工程师

**时间预算**：4h（Day 1 13:30-17:30）

**前置依赖**：A4 完成

**你的任务**：实现球体几何 + Equirectangular 纹理映射。

**你的交付物**：
1. `src/render3d/sphere-shell.js` — 实现 `INTERFACES.md §6.2`

**关键技术点**：
- 球体：SphereGeometry(radius=2, widthSegments=64, heightSegments=32)
- 全景图：直接贴，Three.js SphereGeometry 默认就是 equirectangular UV
- 普通图：居中裁剪到 2:1 再贴（`canvas.drawImage` + 裁剪）
- 纹理：THREE.TextureLoader + Texture.flipY = false

**接口要求**：严格按 `INTERFACES.md §6.2`

**验收**：
- [ ] 加载一张全景图，渲染到球体上，从内部看是 360° 全景
- [ ] 加载一张普通图，居中拉伸也能渲染

**PR 标题**：`[A5] 球体几何 + Equirectangular 纹理加载`

---

### A6｜碎片工程师

**时间预算**：4h（Day 1 13:30-17:30）

**前置依赖**：A4 完成

**你的任务**：把球体切成碎片 + 炸裂/聚合动画。

**你的交付物**：
1. `src/render3d/shard-mesh.js` — 实现 `INTERFACES.md §6.3`
2. `src/render3d/topology.js` — Voronoi 拓扑生成（demo 阶段写死 6 片即可）

**关键技术点**：
- demo 阶段**不要**实时算 Voronoi，硬编码 6 片楔形（按经度 6 等分）
- 每片是一个独立的 mesh，共享球体 UV 区域
- 炸裂：每片随机方向飞散 + 旋转
- 聚合：贝塞尔曲线飞回原位
- 用 tween 库（推荐 @tweenjs/tween.js，CDN 引入）或手写 easing

**接口要求**：严格按 `INTERFACES.md §6.3`

**验收**：
- [ ] 球体能被切成 6 片
- [ ] 调用 `explode()` 碎片飞散
- [ ] 调用 `aggregate()` 碎片飞回形成球体

**PR 标题**：`[A6] 6 片楔形碎片 + explode/aggregate 动画`

---

### A7｜接缝工程师

**时间预算**：2h（Day 1 13:30-15:30）

**前置依赖**：A6 完成

**你的任务**：碎片间 1px 彩色发光描边。

**你的交付物**：
1. `src/render3d/shard-seam.js` — 实现 `INTERFACES.md §6.4`

**关键技术点**：
- 最简方案：每片 mesh 边缘加 0.01 厚度的 emissive 描边
- 进阶方案：后处理 OutlinePass（如果时间够）
- 颜色：可动态切换（demo 阶段可固定 `#88ddff`）

**接口要求**：严格按 `INTERFACES.md §6.4`

**验收**：
- [ ] 碎片间有明显彩色描边
- [ ] `setEnabled(false)` 描边消失

**PR 标题**：`[A7] 碎片间彩色发光描边`

---

### A8｜绑定工程师

**时间预算**：3h（Day 1 13:30-16:30）

**前置依赖**：A5 + A6 完成

**你的任务**：把 N 张素材绑到 N 个碎片 + 点击碎片切视角。

**你的交付物**：
1. `src/render3d/panorama-bind.js` — 实现 `INTERFACES.md §6.5`

**关键技术点**：
- `bind(materials, shards)`：第 N 张图贴到第 N 个碎片的 UV 区域
- `swapTo(shardId)`：相机聚焦到该碎片（可以是球面 UV 偏移，也可以是 zoom-in 动画）
- **不绑定图时显示灰色占位**，不要黑屏

**接口要求**：严格按 `INTERFACES.md §6.5`

**验收**：
- [ ] 3 张图，3 个碎片，每个碎片显示对应图
- [ ] 点击碎片 1，主纹理切到图 1
- [ ] 没绑的碎片显示灰色

**PR 标题**：`[A8] 素材↔碎片绑定 + swapTo 切视角`

---

## 🟡 Group 2｜2D 兜底

### A9｜2D 兜底工程师

**时间预算**：4h（Day 1 13:30-17:30）

**前置依赖**：无（独立模块）

**你的任务**：WebGL 不可用时的 CSS 3D 伪球体。

**你的交付物**：
1. `src/render2d/fallback.js` — 实现 `INTERFACES.md §6.6`
2. `src/render2d/fallback.css` — CSS 3D transform 样式

**关键技术点**：
- 用 6 个 div 模拟立方体 6 面
- CSS `transform-style: preserve-3d` + `rotateY/X`
- 拖拽时改父容器 transform
- 注意 2D 模式下**没有碎片、没有接缝**，整个球就是一个旋转方块

**接口要求**：严格按 `INTERFACES.md §6.6`

**验收**：
- [ ] 强制 2D 模式（`SM.renderMode = '2d'`）能渲染
- [ ] 拖拽能旋转

**PR 标题**：`[A9] CSS 3D 兜底球体`

---

### A10｜降级链路工程师

**时间预算**：2h（Day 1 13:30-15:30）

**前置依赖**：A4 + A9 完成

**你的任务**：WebGL 检测 + 自动切换渲染模式。

**你的交付物**：
1. `src/render3d/mode-detect.js`（集成到 app.js 也行）

**关键技术点**：
```js
function detectWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
}
```

**接口要求**：
- `SM.webglOK` 和 `SM.renderMode` 必须正确设置
- emit `render:mode-change` 事件

**验收**：
- [ ] 在禁用 WebGL 的浏览器自动走 2D
- [ ] 正常浏览器走 3D

**PR 标题**：`[A10] WebGL 检测 + 自动降级`

---

## 🟠 Group 3｜动效与交互（**最拉分，优先保证质量**）

### A11｜封面视觉工程师

**时间预算**：3h（Day 1 13:30-16:30）

**前置依赖**：A1 骨架完成

**你的任务**：实现 `cover` 态的视觉。

**你的交付物**：
1. `src/ui/cover.js` — 实现 `INTERFACES.md §6.11`
2. `src/ui/cover.css` — 封面样式

**关键技术点**：
- 标题："球形镜像・碎镜成忆"
- 副标题："点击镜子，将你的旅行、日常回忆，碎成一颗可旋转的全景记忆球"
- 中央：一个呼吸/脉冲的镜面元素（CSS animation 即可）
- 引导：闪烁的手型图标 + "轻击屏幕中央的镜子区域" 文字
- 背景：低饱和度渐变（demo 推荐深紫→深蓝）

**接口要求**：严格按 `INTERFACES.md §6.11`

**验收**：
- [ ] 视觉有质感（不土）
- [ ] 镜面在呼吸
- [ ] 点击中央触发 `SM.go('mirror')`

**PR 标题**：`[A11] 封面视觉 + 呼吸镜面 + 引导图标`

---

### A12｜镜面态工程师

**时间预算**：3h（Day 1 13:30-16:30）

**前置依赖**：A1 骨架完成

**你的任务**：实现 `mirror` 态（抽象镜面 + 预加载进度 + 提示点击）。

**你的交付物**：
1. `src/ui/mirror.js` — 实现 `INTERFACES.md §6.12`

**关键技术点**：
- 镜面：可以用 SVG 或 canvas 画一个"不规则边缘"的镜面（demo 阶段用圆形 + 边缘模糊也 OK）
- 进度环：预加载素材时显示，监听 `materials:ready` 后隐藏
- 提示文字："点击 3 次镜子，让它破碎成记忆球"

**接口要求**：严格按 `INTERFACES.md §6.12`

**验收**：
- [ ] 切到 mirror 态显示镜面
- [ ] 进度环能随 `setProgress` 更新
- [ ] 提示文字清晰

**PR 标题**：`[A12] 镜面态 + 预加载进度环`

---

### A13｜裂纹动画工程师（**关键创意**）

**时间预算**：4h（Day 1 13:30-17:30）

**前置依赖**：A12 完成

**你的任务**：3 段式裂纹动画。

**你的交付物**：
1. `src/anim/mirror-crack.js` — 实现 `INTERFACES.md §6.7`
2. 3 套裂纹 SVG（中心点、扩散、炸裂）

**关键技术点**：
- 第 1 次：镜面中心出现一个冲击点
- 第 2 次：裂纹向边缘扩散（5~8 条放射状裂纹）
- 第 3 次：整面镜炸裂 → 触发 `crack:explode` 事件（A14 监听）
- 实现方式：SVG path 动画 / canvas 绘制
- 监听 `input:tap` 计数，到 3 自动 stage(3)

**接口要求**：严格按 `INTERFACES.md §6.7`

**验收**：
- [ ] 点 1 次：中心点
- [ ] 点 2 次：扩散
- [ ] 点 3 次：炸裂 + emit `crack:explode`
- [ ] reset() 能回到第 0 阶段

**PR 标题**：`[A13] 3 段式裂纹动画 + 阶段触发`

---

### A14｜聚合动画工程师（**关键创意**）

**时间预算**：4h（Day 1 13:30-17:30）

**前置依赖**：A6 完成

**你的任务**：碎片聚合到球体。

**你的交付物**：
1. `src/anim/aggregate.js` — 实现 `INTERFACES.md §6.8`

**关键技术点**：
- 监听 `crack:explode`，自动播放
- 每片碎片从炸散的位置飞回目标球面位置
- 路径：贝塞尔曲线 + 旋转
- 时长：1200ms
- 完成后 emit `aggregate:done`（A0 监听切到 sphere 态）

**接口要求**：严格按 `INTERFACES.md §6.8`

**验收**：
- [ ] 炸裂后碎片自动飞回
- [ ] 1000~1200ms 完成
- [ ] 完成时 emit `aggregate:done`

**PR 标题**：`[A14] 碎片聚合动画 + aggregate:done 事件`

---

### A15｜旋转工程师

**时间预算**：3h（Day 1 13:30-16:30）

**前置依赖**：A3 + A6 完成

**你的任务**：拖拽控制球体旋转。

**你的交付物**：
1. `src/anim/shard-rotate.js` — 实现 `INTERFACES.md §6.9`

**关键技术点**：
- 监听 `input:drag`，调用 `shardMesh.rotateBy(dx, dy)`
- 惯性：drag-end 后用 0.95 衰减继续旋转
- 在 sphere 态启用，其他态禁用

**接口要求**：严格按 `INTERFACES.md §6.9`

**验收**：
- [ ] 拖拽球体能旋转
- [ ] 松手后有惯性
- [ ] cover/mirror 态不响应

**PR 标题**：`[A15] 拖拽旋转 + 惯性衰减`

---

### A16｜碎片交互工程师

**时间预算**：3h（Day 1 16:30-19:30）

**前置依赖**：A6 + A8 完成

**你的任务**：点击碎片切视角（zoom-in 效果）。

**你的交付物**：
1. `src/anim/shard-interact.js` — 实现 `INTERFACES.md §6.10`

**关键技术点**：
- raycast 检测点击命中哪个碎片
- 命中后：
  1. emit `shard:tap` { shardId }
  2. 调 `panoramaBind.swapTo(shardId)`
  3. 视觉效果：相机推进到该碎片
- 再次点击：resetView

**接口要求**：严格按 `INTERFACES.md §6.10`

**验收**：
- [ ] 点击碎片 A：相机推进，显示 A 的全景
- [ ] 再次点击：恢复球体
- [ ] 拖拽不会误触

**PR 标题**：`[A16] 碎片点击 raycast + 切视角动画`

---

### A17｜音效工程师

**时间预算**：3h（Day 1 13:30-16:30）

**前置依赖**：无

**你的任务**：3 个音效 + 1 个 ambient。

**你的交付物**：
1. `src/audio/sound-fx.js` — 实现 `INTERFACES.md §6.18`
2. `assets/audio/break.mp3` — 玻璃破碎
3. `assets/audio/aggregate.mp3` — 清脆编钟
4. `assets/audio/switch.mp3` — 短促钢琴
5. `assets/audio/ambient.mp3` — 封面背景

**关键技术点**：
- 用 Web Audio API 加载 + 播放
- **音频文件你可以用 freesound.org / zapsplat.com 下载，或 AI 生成**
- 监听事件自动播放：
  - `crack:stage-3` → break
  - `aggregate:done` → aggregate
  - `shard:tap` → switch
  - `state:change` to cover → ambient

**接口要求**：严格按 `INTERFACES.md §6.18`

**验收**：
- [ ] 4 个音效都能播放
- [ ] 自动监听事件触发对应音效
- [ ] 静音按钮工作

**PR 标题**：`[A17] 4 个音效 + 事件自动触发`

---

## 🔴 Group 4｜输入输出

### A18｜上传 UI 工程师

**时间预算**：2h（Day 1 13:30-15:30）

**前置依赖**：A1 骨架完成

**你的任务**：文件上传 UI。

**你的交付物**：
1. `src/upload/file-picker.js` — 实现 `INTERFACES.md §6.14`
2. `src/upload/file-picker.css`

**关键技术点**：
- 入口：cover 页右上角小按钮（图标：`⬆` 或 SVG）
- 两种交互：点击弹文件选择、拖拽到页面任意位置
- 多选支持
- 选完后 emit `files:selected` { files }

**接口要求**：严格按 `INTERFACES.md §6.14`

**验收**：
- [ ] 按钮可见但不抢眼
- [ ] 点击和拖拽都能选文件
- [ ] 多选正常
- [ ] 选完 emit 事件

**PR 标题**：`[A18] 上传 UI + 拖拽支持`

---

### A19｜素材路由工程师

**时间预算**：3h（Day 1 13:30-16:30）

**前置依赖**：A18 完成

**你的任务**：判断素材类型（全景图 vs 普通图）+ 处理。

**你的交付物**：
1. `src/upload/material-router.js` — 实现 `INTERFACES.md §6.15`

**关键技术点**：
- 用 Image 对象读取宽高比
- 宽高比 ≈ 2:1 判定为全景图（容差 0.1）
- 普通图处理：居中裁剪成 2:1 → 转为 objectURL
- 监听 `files:selected`，处理完后 emit `materials:ready`
- **不要做 EXIF 解析、不要做人脸检测**（砍掉了）

**接口要求**：严格按 `INTERFACES.md §6.15`

**验收**：
- [ ] 2:1 图判定为 panorama
- [ ] 4:3 图判定为 normal + 居中裁剪
- [ ] 处理后 emit `materials:ready` { materials }

**PR 标题**：`[A19] 素材路由（panorama/normal 判定）`

---

### A20｜截图工程师

**时间预算**：2h（Day 1 16:30-18:30）

**前置依赖**：A4 完成

**你的任务**：截图当前画面。

**你的交付物**：
1. `src/output/screenshot.js` — 实现 `INTERFACES.md §6.16`

**关键技术点**：
- `renderer.domElement.toDataURL('image/png')`
- 转 Blob
- 触发下载：`<a download="memory-sphere.png" href=blobUrl>`
- emit `screenshot:done`

**接口要求**：严格按 `INTERFACES.md §6.16`

**验收**：
- [ ] 点击截图按钮自动下载
- [ ] 下载的图能看到球体

**PR 标题**：`[A20] canvas 截图 + 自动下载`

---

### A21｜分享工程师

**时间预算**：2h（Day 1 16:30-18:30）

**前置依赖**：A20 完成

**你的任务**：Web Share API + 降级。

**你的交付物**：
1. `src/output/share.js` — 实现 `INTERFACES.md §6.17`

**关键技术点**：
- 优先 `navigator.share({ files: [file] })`
- 不支持：复制 base64 到剪贴板
- 还不支持：弹窗显示 base64 让用户复制
- 完成后 emit `share:done`

**接口要求**：严格按 `INTERFACES.md §6.17`

**验收**：
- [ ] 移动端：调起系统分享面板
- [ ] PC：复制到剪贴板或弹窗

**PR 标题**：`[A21] Web Share + 降级链路`

---

### A22｜HUD 按钮工程师

**时间预算**：2h（Day 1 16:30-18:30）

**前置依赖**：无

**你的任务**：右下角悬浮按钮组。

**你的交付物**：
1. `src/ui/hud.js` — 实现 `INTERFACES.md §6.13`
2. `src/ui/hud.css`

**关键技术点**：
- 3 个按钮：📷 截图 / 🔗 分享 / 🔄 重置
- 重置：emit 一个新事件 `state:reset`（A0 在 state-machine 里加），回到 cover
- 截图 loading：按钮显示 spinner
- 只在 sphere 态显示

**接口要求**：严格按 `INTERFACES.md §6.13`

**验收**：
- [ ] sphere 态显示，其他态隐藏
- [ ] 3 个按钮都能点击
- [ ] 重置回到 cover

**PR 标题**：`[A22] HUD 按钮（截图/分享/重置）`

---

## 🟣 Group 5｜演示与压舱石

### A23｜预置素材工程师

**时间预算**：1h（Day 1 13:30-14:30）

**前置依赖**：无

**你的任务**：准备 3 套预置全景图（demo 兜底）。

**你的交付物**：
1. `assets/fallback/preset-1/cover.jpg` + 5 张全景图
2. `assets/fallback/preset-2/cover.jpg` + 5 张
3. `assets/fallback/preset-3/cover.jpg` + 5 张

**关键技术点**：
- 用 Poly Haven HDRIs（CC0 协议）下载
- 或用 [全景图片网站](https://polyhaven.com/hdris)
- 每套：1 张封面缩略图（200x100）+ 5 张 2048x1024 全景图
- 分类：自然 / 城市 / 室内

**接口要求**：无（纯资产）

**验收**：
- [ ] 3 套 18 个文件齐全
- [ ] 全景图宽高比 2:1

**PR 标题**：`[A23] 3 套预置全景图素材`

---

### A24｜演示模式工程师

**时间预算**：2h（Day 2 09:00-11:00）

**前置依赖**：全链路跑通

**你的任务**：一键自动演示。

**你的交付物**：
1. `src/demo/mode.js` — 实现 `INTERFACES.md §6.19`
2. `src/demo/mode.css`

**关键技术点**：
- 启动方式：URL 加 `#demo` 或长按封面 3 秒
- 流程：
  ```
  0s    切到 mirror
  2s    模拟点击 3 次（trigger crack stage 1,2,3）
  4s    等待 aggregate 完成
  6s    模拟拖拽旋转 2 秒
  8s    点击截图按钮
  10s   回到 cover
  ```
- 每步用 setTimeout 串联
- 演示中显示一个"🤖 自动演示中"小角标

**接口要求**：严格按 `INTERFACES.md §6.19`

**验收**：
- [ ] 访问 `index.html#demo` 自动跑完全流程
- [ ] 现场可中止

**PR 标题**：`[A24] 自动演示模式`

---

### A25｜录屏工程师

**时间预算**：1h（Day 2 14:00-15:00）

**前置依赖**：全链路 + 演示模式

**你的任务**：录 60s 兜底视频。

**你的交付物**：
1. `assets/demo-backup.mp4` — 完整流程
2. `assets/demo-backup-mobile.mp4` — 移动端竖屏

**关键技术点**：
- 用 OBS / Loom / 录屏软件
- 录 2 遍：横屏（PC 视角）+ 竖屏（手机视角）
- 全程 60s，覆盖 cover→mirror→crack→aggregate→sphere→screenshot

**接口要求**：无

**验收**：
- [ ] 视频能播
- [ ] 包含完整流程

**PR 标题**：`[A25] 兜底演示视频`

---

### A26｜移动端适配工程师

**时间预算**：3h（Day 2 09:00-12:00）

**前置依赖**：A1 + A11 + A12 + A22 全部完成

**你的任务**：让移动端体验达标。

**你的交付物**：
1. `src/styles/mobile.css` — 完善移动端
2. 必要时改 `src/ui/*.js`

**关键技术点**：
- viewport：`width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`
- 安全区：`env(safe-area-inset-*)`
- 按钮 ≥ 44px
- iOS Safari 兼容：`-webkit-touch-callout: none`
- 横竖屏适配
- 测试：iPhone SE / iPhone 14 Pro / 任意安卓

**接口要求**：无（只改样式 + 少量 JS）

**验收**：
- [ ] iPhone Safari 正常
- [ ] 微信内置浏览器正常
- [ ] 按钮可点
- [ ] 球体填满屏幕

**PR 标题**：`[A26] 移动端深度适配`

---
