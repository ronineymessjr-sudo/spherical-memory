# spherical-memory MVP 实施方案

## 1. 目标重定义

这份项目原文档是按「2 天黑客松 + 20 多个并行 Agent」设计的。
但当前仓库真实状态不是一个待联调的大项目，而是一个**只有基础骨架、缺核心功能模块**的 H5 原型。

所以实施时不应该继续按 A1~A26 全量推进，而应该改成：

**目标**：先做出一个稳定可演示的 H5 MVP。

**MVP 演示链路**：

1. 打开页面看到封面
2. 点击进入镜面态
3. 连点镜面 3 次触发裂纹与炸裂
4. 镜面碎片聚合成可旋转的 3D 球体
5. 球体可拖拽旋转
6. 使用预置素材完成视觉展示
7. 点击截图按钮导出 PNG
8. `?demo=1` 可以自动演示完整流程

只要这 8 步稳定跑通，这个项目就已经满足“能拿出来演示”的标准。

---

## 2. 当前状态判断

### 已有

- `index.html`
- `src/core/app.js`
- `src/core/event-bus.js`
- `src/core/state-machine.js`
- `src/input/unified-input.js`
- `src/styles/base.css`
- `src/styles/mobile.css`
- `docs/INTERFACES.md`
- `docs/WORKFLOW.md`
- `docs/AGENT_PROMPTS.md`

### 实际缺失

- `src/render3d/*`
- `src/render2d/*`
- `src/anim/*`
- `src/ui/*`
- `src/upload/*`
- `src/output/*`
- `src/audio/*`
- `src/demo/*`

### 结论

当前仓库不是“差最后联调”，而是“差核心模块实现”。
因此必须从 **A4/A11/A12/A13/A14/A15/A20/A22/A23/A24** 这几类功能里，先抽出一条最短闭环。

---

## 3. 范围裁剪

### P0：必须完成

- A4 `render3d.scene`
- A6 `render3d.shardMesh`
- A8 `render3d.panoramaBind` 的最小版
- A11 `ui.cover`
- A12 `ui.mirror`
- A13 `anim.mirrorCrack`
- A14 `anim.aggregate`
- A15 `anim.shardRotate`
- A20 `output.screenshot`
- A22 `ui.hud`
- A23 预置素材
- A24 `demo.mode`

### P1：有时间再做

- A5 `sphereShell` 完整纹理球壳
- A16 碎片点击切视角
- A17 音效
- A21 分享
- A26 深度移动端适配

### P2：先不做

- A9 2D 兜底
- A10 自动降级链路
- A18 上传 UI
- A19 素材路由
- A25 录屏资产
- 真正的 Voronoi 拓扑切片

### 说明

MVP 阶段不追求“完整产品”，只追求“最强 60 秒演示”。
任何不直接服务于演示闭环的功能，默认后移。

---

## 4. 实施里程碑

## M1：跑通状态骨架 + 可见 UI

**目标**：页面不再是黑屏，能从 `cover` 切到 `mirror`。

**需要实现**

- `src/ui/cover.js`
- `src/ui/mirror.js`
- `src/ui/hud.js` 的空壳版

**结果标准**

- 访问首页能看到封面文案和进入提示
- 点击封面后切换到镜面页
- 镜面页能显示“点击 3 次”的引导
- `SM.go('cover')` / `SM.go('mirror')` 可手动调试

**验证**

- 浏览器打开 `index.html`
- Console 执行 `SM.go('mirror')`
- 页面状态可见切换，无报错

---

## M2：跑通 3D 球体最小场景

**目标**：有一个真正可显示的 Three.js 场景，先不管精细效果。

**需要实现**

- `src/render3d/scene.js`
- `src/render3d/shard-mesh.js`

**实现策略**

- 不做真实 Voronoi
- 直接硬编码 6 片规则楔形碎片
- 每片都是独立 mesh
- 初始可先用纯色材质确认几何正确

**结果标准**

- `sphere-container` 中能看到 3D 内容
- 6 片碎片可以被创建并挂到 `SM.shards`
- 场景相机、灯光、渲染循环正常

**验证**

- Console 可拿到 `SM.modules.render3d.scene.getRenderer()`
- 碎片存在且无 WebGL 报错

---

## M3：跑通“镜裂 -> 聚合成球”

**目标**：完成最核心的创意记忆点。

**需要实现**

- `src/anim/mirror-crack.js`
- `src/anim/aggregate.js`

**实现策略**

- 裂纹动画先用 DOM/CSS 覆盖层完成，不追求复杂 shader
- 第 1 次点击：轻微裂纹
- 第 2 次点击：裂纹扩散
- 第 3 次点击：镜面隐藏，触发 `crack:explode`
- `aggregate.js` 监听 `crack:explode`
- 碎片从散开位置聚合到球体位置

**结果标准**

- 用户连点 3 次后能看到明显状态变化
- 最后稳定进入 `sphere`
- `?autoclick=3` 可自动跑通

**验证**

- 打开 `index.html?autoclick=3`
- 10 秒内必须能进入球体态

---

## M4：给碎片贴图，保证“内容感”

**目标**：从“几何 demo”升级为“记忆球 demo”。

**需要实现**

- `src/render3d/panorama-bind.js`
- `assets/fallback/` 内至少 6 张预置图

**实现策略**

- MVP 阶段不用做复杂上传和分类
- 先只支持预置素材
- 每片碎片绑定一张图
- 先保证“每片有图”，再考虑“整球全景连续性”

**结果标准**

- 6 片碎片都能显示不同图像
- 页面看起来不再是技术骨架，而是有作品感

**验证**

- 聚合后球体可见图像内容
- 刷新后仍稳定加载

---

## M5：球体交互 + 截图闭环

**目标**：从“能看”变成“能玩一下”。

**需要实现**

- `src/anim/shard-rotate.js`
- `src/output/screenshot.js`
- `src/ui/hud.js` 正式版

**实现策略**

- 旋转只做拖拽旋转 + 惯性衰减
- 不做缩放也可以接受
- HUD 只保留 3 个按钮：截图、重置、演示

**结果标准**

- 手动拖拽能旋转球体
- 点击截图能导出 PNG
- 点击重置能回到 `cover`

**验证**

- 桌面端鼠标拖拽正常
- 移动端触摸拖拽基本可用
- 下载的图片确实包含球体画面

---

## M6：自动演示模式

**目标**：把这个项目变成真正适合现场展示的 demo。

**需要实现**

- `src/demo/mode.js`

**实现策略**

- 进入后自动：
  1. 等待封面 1 秒
  2. 切到镜面
  3. 自动点击 3 次
  4. 等待聚合完成
  5. 自动缓慢旋转球体
  6. 自动截图或停留展示

**结果标准**

- `?demo=1` 能全自动跑一遍
- 整个流程控制在 45 到 60 秒

**验证**

- 打开 `index.html?demo=1`
- 不人工操作也能完整走完演示链路

---

## 5. 推荐开发顺序

不要按原文档从 A1 写到 A26。
按下面顺序做最快：

1. `ui.cover`
2. `ui.mirror`
3. `render3d.scene`
4. `render3d.shardMesh`
5. `anim.mirrorCrack`
6. `anim.aggregate`
7. `panoramaBind`
8. `anim.shardRotate`
9. `ui.hud`
10. `output.screenshot`
11. `demo.mode`

这个顺序的原则是：

- 先让页面有东西看
- 再让核心创意跑通
- 最后补“演示友好性”

---

## 6. 单人 / 小团队拆分建议

## 单人版本

按 4 个开发块推进：

1. **界面块**
   `cover + mirror + hud`
2. **3D 块**
   `scene + shardMesh + panoramaBind`
3. **动效块**
   `mirrorCrack + aggregate + shardRotate`
4. **闭环块**
   `screenshot + demo.mode + reset`

## 2 人版本

1 号负责：

- UI
- 动效
- 演示模式

2 号负责：

- Three.js 场景
- 碎片几何
- 贴图与截图

## 3 人版本

1 号：

- UI + HUD + demo

2 号：

- scene + shardMesh + rotate

3 号：

- crack + aggregate + bind + screenshot

---

## 7. 风险与砍功能原则

### 风险 1：Three.js 碎片几何难度超预期

处理：

- 直接从 6 片规则楔形开始
- 不做真实 Voronoi

### 风险 2：贴图连续性不好看

处理：

- MVP 接受“每片独立记忆图”
- 不强求无缝全景球

### 风险 3：移动端卡顿

处理：

- 先保桌面演示
- 移动端只保证能拖拽，不保证高帧率

### 风险 4：截图兼容性

处理：

- 优先从 `renderer.domElement.toDataURL()` 走
- 分享后移，截图先保住

### 风险 5：时间不够

按这个顺序砍：

1. 分享
2. 音效
3. 碎片点击切视角
4. 上传素材
5. 2D 兜底

绝对不能砍：

1. cover -> mirror
2. 3 次点击裂开
3. 聚合成球
4. 球体旋转
5. 预置素材
6. `?demo=1`

---

## 8. 完成标准

这个项目可以视为“完成 MVP”的标准是：

- 首屏有封面，不黑屏
- 手动流程能走通
- `?autoclick=3` 能自动进球体
- `?demo=1` 能自动演示
- 球体可旋转
- 至少有 6 张预置素材
- 截图可导出
- 全流程无阻塞性报错

如果以上都达成，就不要继续发散做小程序、后台、上传系统。
先把这个版本当作 **可展示作品 1.0** 固化下来。

---

## 9. 下一步执行建议

建议直接进入以下首轮开发：

1. 先实现 `src/ui/cover.js`
2. 再实现 `src/ui/mirror.js`
3. 再实现 `src/render3d/scene.js`
4. 做一个最简 6 片碎片球
5. 用 `?autoclick=3` 打通闭环

只要这 5 步走通，项目就从“规划文档”进入“真实 demo”阶段了。
