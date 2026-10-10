# 沪深300智能选股与条件解释器

> 把模糊的选股想法，转化为结构化、可验证、有数据证据的筛选条件与结果解释。

## 这是什么

本应用帮助有选股意图但不熟悉金融指标表达的用户，将自然语言描述的需求（如"找低估值高成长的公司"）转化为结构化的筛选条件，基于真实金融数据在沪深300成分股范围内执行筛选，并为每只候选股票提供**入选依据 / 排除原因 / 数据时点**的透明解释。

**核心能力**

- 自然语言转结构化条件：输入描述 → 生成条件草案（字段 + 运算符 + 阈值）+ 澄清说明
- 条件卡片编辑：检查、修改、增删条件，支持 gt/gte/lt/lte/eq/between 运算符与窗口调整
- 冲突检测：自动识别逻辑矛盾（如 PE < 0 且 PE > 10），阻止执行并提示
- 确定性筛选引擎：基于真实金融数据，按条件逐只计算入选 / 排除 / 无法判断
- 结果解释：每只股票展示入选依据、排除原因、数据来源与时点
- 条件修改差异：修改条件后对比前后结果，展示新增 / 退出 / 未变及原因
- 候选股比较：多选股票横向对比关键指标
- 策略保存：保存条件版本（不含结果快照），按用户隔离

**股票池范围**：沪深300成分股（000300.SH），共 300 只，不代表全市场。

**合规声明**：本应用仅为金融数据筛选和分析工具，不构成任何投资建议、推荐或承诺；不预测涨跌、不做回测、不自动交易、不承诺收益。投资有风险，入市需谨慎。

## 安装依赖

```bash
npm install
```

## 本地运行

```bash
npm run dev
```

前端默认运行在 `http://localhost:5173`，后端运行在 `http://localhost:3000`。

## 运行测试

单元测试使用 Node.js 内置 test runner + tsx：

```bash
# 运行全部单元测试（扶摇 Key 校验 / 聚合逻辑 / 快照有效性 / 波动率）
npx tsx --test server/modules/screen-engine/utils/*.test.ts server/modules/fuyao-data/utils/*.test.ts
```

类型检查：

```bash
npm run type:check
```

## 扶摇数据 Key 配置

金融数据由**扶摇金融数据 API** 提供，需要配置 API Key 后才能使用筛选功能。

**环境变量名**：`FUYAO_API_KEY`

| 环境 | 配置方式 |
|---|---|
| 本地开发 | 在项目根目录 `.env` 文件中添加 `FUYAO_API_KEY=your_key_here` |
| 服务端部署 | 在部署平台的环境变量中设置 `FUYAO_API_KEY` |

安全说明：

- 密钥仅从服务端环境变量读取，**绝不**返回前端、写入日志或提交代码仓库
- `.env` 文件已在 `.gitignore` 中排除
- 配置完成后，应用内「配置」页会显示扶摇服务就绪状态

未配置 Key 时，应用仍可打开并使用条件编辑、AI 解析等功能，但涉及真实金融数据的筛选接口将返回 503 服务不可用。

## 当前状态

**开发预览** — 功能已基本就绪，尚未正式发布。数据与结果仅供内部验证使用。

## 目录结构

```
├── client/          # 前端（React + TypeScript + Vite）
│   └── src/
│       ├── pages/   # 选股主页 / 策略列表 / 配置页
│       ├── components/
│       └── api/
├── server/          # 后端（NestJS + TypeScript）
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/      # 通用 filter / interface
│   ├── database/    # Drizzle ORM schema
│   └── modules/     # fuyao-data / screen-engine / ai-parse / strategy / config
├── shared/          # 前后端共享类型
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```
