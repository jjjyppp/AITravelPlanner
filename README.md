# AI 旅行规划师 (AI Travel Planner)

一个基于React的智能旅行规划应用，通过AI技术帮助用户快速规划旅行行程，管理预算，并提供实时旅行辅助。

## 核心功能

1. **智能行程规划**：支持文字和语音输入旅行需求（目的地、日期、预算、人数、偏好），AI自动生成个性化旅行路线
2. **费用预算与管理**：AI进行预算分析，记录旅行开销（支持语音输入）
3. **用户管理与数据存储**：用户可以注册登录，保存和管理多份旅行计划，实现云端同步

## 技术栈

- **前端框架**：React 19
- **UI组件库**：Material-UI (@mui/material)
- **路由管理**：React Router
- **图表可视化**：Chart.js + react-chartjs-2
- **样式处理**：CSS变量 + 响应式设计
- **语音识别**：Web Speech API

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 使用说明

1. **规划新行程**：
   - 在首页输入旅行目的地、天数、预算等信息
   - 或点击语音按钮，直接说出你的旅行需求（如："我想去日本，5天，预算1万元，喜欢美食和动漫"）
   - 点击生成按钮，查看AI为你定制的行程

2. **用户账户**：
   - 注册或登录账户以保存你的行程
   - 测试账号：demo / 123456

3. **预算管理**：
   - 记录每日支出
   - 通过图表查看支出分析
   - 支持语音输入记录费用

## 项目结构

```
src/
  ├── pages/           # 页面组件
  │   ├── HomePage.jsx
  │   ├── LoginPage.jsx
  │   ├── RegisterPage.jsx
  │   ├── ItineraryDetailPage.jsx
  │   ├── MyTripsPage.jsx
  │   └── BudgetPage.jsx
  ├── App.jsx          # 应用主组件
  ├── main.jsx         # 应用入口
  ├── index.css        # 全局样式
  └── App.css          # 应用特定样式
```

## 浏览器兼容性

- Chrome (推荐)
- Edge
- Firefox
- Safari

**注意**：语音识别功能在不同浏览器中可能有差异，推荐使用Chrome浏览器以获得最佳体验。

## 许可证

MIT
