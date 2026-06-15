# 参与 AIKit

欢迎！AIKit 是一个个人 + 朋友间使用的极简 AI Web 工作台，也欢迎陌生人提 Bug、改进或功能建议。

这份文档讲三件事：

1. 报 Bug / 提建议怎么走
2. 想自己改代码：本地怎么跑、PR 怎么提
3. 哪些东西 **不接** —— 提前对齐预期，免得双方都白费力

---

## 1. 报 Bug 或提建议

- **Bug** → [开 Issue · Bug Report](https://github.com/KerroKapple/AIKit/issues/new?template=bug_report.yml)，把模板填全。
- **新功能 / 改进** → [开 Issue · Feature Request](https://github.com/KerroKapple/AIKit/issues/new?template=feature_request.yml)。
- **不确定算不算 Bug、想讨论想法** → 去 [Discussions](https://github.com/KerroKapple/AIKit/discussions)。

> Issue 模板里要求的信息（复现步骤、环境、日志）**不是走过场** —— 缺了的话很难定位，issue 多半会被拖很久。

---

## 2. 自己改代码

### 本地跑起来

```bash
git clone https://github.com/KerroKapple/AIKit.git
cd AIKit
cp .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY（阿里云 DashScope 控制台申请）
npm install
npm run dev
# http://localhost:3000
```

### 提 PR 流程

1. **先开 Issue** 讨论，避免做完发现方向不对
   - 小改动（typo / 文档 / 一行 bug fix）可以直接提 PR，免讨论
2. Fork 仓库 → 在自己 fork 上建分支：
   ```bash
   git checkout -b fix/some-bug      # 或 feat/xxx, docs/xxx, chore/xxx
   ```
3. 改完前必须本地通过：
   ```bash
   npm run typecheck    # 类型必须过
   npm test             # 单测必须过
   ```
4. **Commit 信息**：参照现有 git log 风格，中文 + Conventional Commits
   ```
   feat(image): 加批量生成开关
   fix(chat): SSE 断线后自动重连
   docs(readme): 补部署排错章节
   ```
5. 推到自己 fork → 在 GitHub 上提 PR 到 `main`，PR 模板填全
6. 等 review。Main 分支受保护，**必须 @KerroKapple approve 才能合并**

### 代码风格

- TypeScript strict 不放水
- 注释用中文，能不写就不写（命名优先）
- 不引入新 lint 规则；不为了"统一"做大规模 reformat
- UI 改动：先在 [shadcn/ui 现有组件](https://ui.shadcn.com/) 找替代，没有再自己写
- 测试：核心逻辑（API 路由、DB 操作、SSE 流转）必须有单测；UI 不强制

---

## 3. 哪些东西不接

为了让项目"小而清晰"，下面这些方向 **不会被合并**：

- ❌ **接其他模型供应商**（OpenAI / Claude / Gemini …）
  - AIKit 是 DashScope 的轻封装，多供应商会把架构吹大。想用别的请 fork。
- ❌ **多用户系统**（注册、权限、订阅）
  - 项目假设是"朋友圈 ≤ 5 人 + Basic Auth"。完整账号体系超出范围。
- ❌ **大规模 UI 重构**
  - 现在是 editorial Studio Dispatch 风格，不接受"我觉得 Material Design 更好看"这种翻盘
- ❌ **强行加框架**（状态管理库、ORM、表单库）
  - 现在用原生 React state + better-sqlite3 + zod，够用就够用
- ❌ **删除中文注释/UI 文案改英文**
  - 中文优先是设计选择，不接受批量改 i18n（除非 issue 里讨论后明确通过）

不确定算不算？先开 issue 问。

---

## 联系

- Issues / PRs 走 GitHub
- 邮件：见 GitHub profile
- Twitter / 微信：暂未开放

谢谢！
