# Day 0 Checklist

> **目标**：今晚搞定基础设施，明早 09:00 直接开干
> **执行人**：A0 整合长（你）
> **时间**：今晚 22:00 - 23:00 + 明早 08:00 - 09:00

---

## 今晚 22:00 - 22:30｜仓库就绪（30 min）

### 22:00 仓库创建
- [ ] 在 GitHub / GitLab / Gitee 创建仓库 `spherical-memory`
- [ ] 设为 Private（演示完再开 Public）
- [ ] 克隆到本地：`git clone <url> && cd spherical-memory`
- [ ] 把当前目录所有文件复制进仓库
- [ ] 第一次提交：
  ```bash
  git add .
  git commit -m "init: docs + 基础设施 + 19 个模块 stub 占位"
  git push origin main
  ```

### 22:10 邀请协作者
- [ ] Settings → Collaborators → 添加 20+ Agent
- [ ] 给每个 Agent 发仓库 URL + 文档链接

### 22:20 Slack 频道（如果用 Slack）
- [ ] `#hackathon-spherical-memory`（主频道）
- [ ] `#phase-0`（Day 1 上午）
- [ ] `#phase-1`（Day 1 下午）
- [ ] `#blockers`（卡点求助，15 分钟无响应 @A0）
- [ ] `#qa`（QA 反馈）

不用 Slack 就用：
- 飞书群 + topic 分组
- 微信群 + 置顶文档
- Discord 服务器

---

## 今晚 22:30 - 23:00｜团队通知 + 验证（30 min）

### 22:30 全员通知

复制以下消息发到主频道：

```
@here 球形镜像 · 碎镜成忆 — Day 1 启动通知

⏰ 时间线（明天）
09:00 - 13:00   Phase 0  基础设施（4 个 Agent 启动）
13:00 - 19:00   Phase 1  18 个 Agent 并行构建
19:00 - 23:00   Phase 1.5 第一次联调
Day 2 09:00 - 12:00   Phase 2  完善 + 移动端
Day 2 12:00 - 18:00   Phase 3  抛光 + 录屏 + 封版

📚 必读（按优先级）
1. docs/INTERFACES.md   — 接口契约
2. docs/AGENT_PROMPTS.md — 你的任务卡
3. docs/WORKFLOW.md     — 流程 + QA 轮转

🚀 09:00 派发
- A1 骨架      → @A1-Agent
- A2 状态机    → @A2-Agent
- A3 输入层    → @A3-Agent
- A4 场景      → @A4-Agent（最优先，13:00 必须完成）

13:00 我会派发剩余 22 个 Agent，届时接口冻结。

🆘 求助
- 卡点超过 1h 在 #blockers 写
- 15 分钟无响应 @ 我

💪 明天见
```

### 22:45 验证基础设施

```bash
# 启动本地 server
cd spherical-memory
python3 -m http.server 8080
# 或 npx serve .
```

浏览器打开 `http://localhost:8080`，**应该看到**：

- [ ] 黑屏（这是正常的，所有模块还是 stub）
- [ ] 打开 DevTools console，看到：

```
[SM] 球形镜像 v1.0.0
[SM] render mode: 3d
[SM] ✗ render3d.scene (not ready): ...
[SM] ✗ render3d.sphereShell (not ready): ...
...（约 18 行）
[SM] ready
```

- [ ] 所有 "not ready" 都是正常的，**只要最后有 `[SM] ready` 就 OK**
- [ ] 测试 URL 参数：`http://localhost:8080?debug=true&autoclick=3`
  - console 应该看到 `[autoclick] will click 3 times`
  - 5 秒后 state 应该是 `sphere`（但没图，因为模块没实现）

### 22:55 备份
- [ ] 把仓库 URL 存到手机备忘录
- [ ] 把文档链接存到手机备忘录（防止笔记本出问题）
- [ ] 闹钟 08:00 + 08:30

### 23:00 睡觉 💤

---

## Day 1 08:00 - 09:00｜A0 单独准备（60 min）

### 08:00 起床 + 咖啡
### 08:30 打开仓库
- [ ] `git pull`（防止有人熬夜 push）
- [ ] 重新启动本地 server
- [ ] 再跑一遍验证（10 秒）
- [ ] 检查 Slack/微信有没有紧急问题

### 08:45 准备派发

打开 `docs/AGENT_PROMPTS.md`，准备好 4 份复制：

1. **A1 骨架** — 9:00 派发
2. **A2 状态机 + 事件总线** — 9:00 派发
3. **A3 输入层** — 9:00 派发
4. **A4 场景** — 9:00 派发（**最优先**）

**13:00 派发的 22 份** 提前复制到一份文档里，13:00 一次性发。

### 09:00 启动 🚀

发 Slack 消息 + 派发 A1-A4 任务。

---

## Day 1 09:00 - 13:00｜Phase 0

按 `WORKFLOW.md` Phase 0 执行。

**A0 检查点**：

| 时间 | 检查 | 决策 |
|---|---|---|
| 11:00 | A1/A2/A3 进度 | 落后 30% 立刻加人或砍范围 |
| 12:30 | A4 进度 | 落后 30% 砍性能自适应；未到 70% 砍自发光接缝 |
| 13:00 | **冻结 INTERFACES.md v1.0.0** | 发全员："接口已冻结，13:30 派发剩余任务" |

**13:00 派发消息模板**：

```
@here 接口已冻结（docs/INTERFACES.md v1.0.0）

现在派发剩余 22 个 Agent：
- A5 球壳  → @A5-Agent
- A6 碎片  → @A6-Agent
- A7 接缝  → @A7-Agent
- A8 绑定  → @A8-Agent
- A9 2D 兜底 → @A9-Agent
- A10 降级链路 → @A10-Agent
- A11 封面 → @A11-Agent
- A12 镜面 → @A12-Agent
- A13 裂纹 → @A13-Agent
- A14 聚合 → @A14-Agent
- A15 旋转 → @A15-Agent
- A16 交互 → @A16-Agent
- A17 音效 → @A17-Agent
- A18 上传 UI → @A18-Agent
- A19 素材路由 → @A19-Agent
- A20 截图 → @A20-Agent
- A21 分享 → @A21-Agent
- A22 HUD → @A22-Agent
- A23 预置素材 → @A23-Agent
- A24 演示模式 → @A24-Agent
- A25 录屏 → @A25-Agent
- A26 移动端 → @A26-Agent

按 AGENT_PROMPTS.md 你的那一节实现。完成后 PR @ 我和 QA-1。
```

---

## 应急方案速查

### A0 失联
- 提前指定 backup（建议 A2，最熟悉代码）
- 30 分钟无响应，backup 自动接管

### A4 进度落后
- 11:00 检查，砍性能自适应
- 12:30 还落后，砍接缝发光
- 13:00 必须能跑

### PR 合入冲突频繁
- 强制小步合入（每 PR ≤ 100 行）
- 增加合入频率到每 1h

### 网络问题
- GitHub 镜像 / GitLab
- Slack 改企业微信

### 现场演示翻车
- `?demo=1` 一键演示
- 录屏兜底视频
- `?debug=true` 可跳态应急

---

## Day 1 23:00｜第一天收工检查

- [ ] A0 评估：演示能到什么程度？
- [ ] 列"已砍功能清单"发全员
- [ ] 备份今天所有代码（git push）
- [ ] 整理 blocker 清单
- [ ] 睡觉 😴

---

## Day 2 18:00｜最终验收检查

按 `WORKFLOW.md §八` 检查清单一项项过。

**最后 5 分钟**：
- [ ] 5 态流程跑通 ✅
- [ ] 截图可下载 ✅
- [ ] 录屏 2 段就位 ✅
- [ ] 演示模式跑通 ✅
- [ ] 移动端 iPhone Safari 通过 ✅
- [ ] 部署到公网 URL ✅
- [ ] 全员知道演示 URL ✅
- [ ] 庆祝 🎉

---

## 写在最后

**今晚能做的就这些**。明早开始就是执行，临时决策会很多，关键是：

1. **接口冻结要狠** — 13:00 之后谁改接口谁加班
2. **集成窗口要频** — 每 2 小时合一次，不要攒到最后
3. **QA 轮转要严** — 不符合接口的一律打回
4. **演示优先** — 砍功能不丢人，跑不通才丢人

**加油 💪**
