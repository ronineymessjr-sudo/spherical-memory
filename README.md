# Spherical Memory

一个面向演示场景的 H5 小项目：从封面进入镜面，镜面被连续点击后裂开，六片“记忆碎片”聚合成可拖拽旋转的 3D 记忆球，并支持截图与自动演示。

## 在线地址

- GitHub 仓库：[ronineymessjr-sudo/spherical-memory](https://github.com/ronineymessjr-sudo/spherical-memory)
- GitHub Pages：<https://ronineymessjr-sudo.github.io/spherical-memory/>

## 功能范围

- `cover -> mirror -> cracking -> sphere -> share` 五态流程
- 连点 3 次镜面触发裂解与聚合动画
- 3D 球体拖拽旋转
- 点击碎片切换当前聚焦内容
- 截图导出
- `?autoclick=3` 自动触发核心链路
- `?demo=1` 自动演示模式

## 本地运行

```bash
npm install
npm run verify
```

开发时直接打开本地静态服务即可，例如：

```bash
npx serve .
```

然后访问：

```text
http://localhost:3000
```

## 演示参数

- `?autoclick=3`：自动点击镜面 3 次，快速进入聚合态
- `?demo=1`：自动演示模式
- `?debug=true`：打开调试标记，便于在控制台观察状态

示例：

```text
http://localhost:3000/?autoclick=3
http://localhost:3000/?demo=1
```

## 验证命令

```bash
npm run build
npm run test
npm run smoke
npm run verify
```

其中 `npm run smoke` 会启动本地静态服务，并在真实浏览器中验证：

- `?autoclick=3` 能进入 `sphere`
- `?demo=1` 能进入自动演示并出现 demo 标记

## 技术栈

- 原生 JavaScript ES Modules
- Three.js
- Vitest
- Puppeteer Core
- GitHub Pages

## 目录说明

```text
src/core         应用启动、事件总线、状态机
src/render3d     3D 场景、球壳、碎片与贴图绑定
src/anim         裂解、聚合、旋转与交互动画
src/ui           封面、镜面、HUD
src/upload       素材选择与路由
src/output       截图与分享
src/demo         自动演示模式
scripts          构建与 smoke 验证
tests            单元测试
```

## 发布

推送到 `main` 后会自动执行 GitHub Actions：

1. `npm ci`
2. `npm run verify`
3. 构建 `dist/`
4. 发布到 GitHub Pages

如果你想直接看演示，优先使用 GitHub Pages 地址。
