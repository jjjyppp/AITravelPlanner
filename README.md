# AI 旅行规划师 (AI Travel Planner)

说明：软件旨在简化旅行规划过程，通过 AI 了解用户需求，自动生成详细的旅行路线与建议，并提供语音输入、地图可视化与费用管理等辅助能力。

## 核心功能（简要）

- 智能行程规划
  - 语音或文字输入旅行需求（目的地、日期、预算、人数、偏好）。
  - 由大语言模型生成个性化行程，覆盖交通、住宿、景点、餐饮与建议。
- 地图概览与路线
  - 使用地图组件绘制路线；点位旁显示名称。
  - 支持“按天”切换查看每天的线路；自动缩放以适配视野。
- 费用预算与管理
  - 按行程记录支出（类别/金额/日期/备注）；支持语音辅助录入。
  - 支持新增、删除与行内编辑；按类别生成统计图表。
- 用户与云端
  - 账号登录/注册；保存多份行程与开销记录。
  - 数据云端同步，便于跨设备查看与修改。

## 技术栈（Web）

- 前端：React 19 + Vite + React Router
- UI：Material-UI (@mui/material)；CSS 变量与响应式样式
- 地图：高德地图 JS API v2.0
- 大模型：OpenAI SDK（对接 Doubao Seed）
- 语音识别：科大讯飞 WebSocket API（语音转文本）
- 数据/认证：Supabase（认证与数据存储）
- 可视化：Chart.js + react-chartjs-2（费用分类统计）

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置 API Key（重要）

切记不要将任何 API Key 写入源码或提交到仓库。请使用以下安全方式配置：

- 方式 A：使用 Vite 环境变量（推荐，不会被提交）
  1) 在项目根目录创建 `.env.local`（已在 `.gitignore` 忽略）。
  2) 写入：
  
  ```env
  # 高德地图 Web API
  VITE_AMAP_KEY=your_map_key
  VITE_AMAP_SECURITY=your_map_security

  # doubao 
  VITE_LLM_API_KEY=your_llm_api_key

  # 讯飞语音识别
  VITE_XF_APP_ID=your_xf_app_id
  VITE_XF_API_KEY=your_xf_api_key
  VITE_XF_API_SECRET=your_xf_api_secret

  # Supabase
  VITE_SUPABASE_URL=your_supabase_url
  VITE_SUPABASE_ANON_KEY=your_supabase_anno_key
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

## 项目结构

```
.
├── src/
│   ├── App.jsx                 # 根组件
│   ├── main.jsx                # 入口文件
│   ├── index.css               # 全局样式
│   ├── App.css                 # 应用样式
│   ├── assets/                 # 静态资源
│   ├── components/
│   │   ├── MapSection.jsx      # 地图：标注名称、折线、按天切换
│   │   ├── SpeechRecognition.jsx  # 语音输入组件
│   │   └── SpeechRecognition.css
│   ├── contexts/
│   │   ├── AuthContext.jsx       # 认证上下文
│   │   └── ItineraryContext.jsx  # 行程 CRUD 封装
│   ├── pages/
│   │   ├── HomePage.jsx          # 首页：表单/自然语言/语音入口
│   │   ├── AIItineraryPage.jsx   # AI 生成页：一次性渲染与地图预览
│   │   ├── ItineraryDetailPage.jsx # 行程详情：地图+内容
│   │   ├── MyTripsPage.jsx       # 我的行程列表
│   │   ├── ExpensePage.jsx       # 旅行开销：增删改+统计
│   │   ├── LoginPage.jsx         # 登录
│   │   └── RegisterPage.jsx      # 注册
│   ├── services/
│   │   ├── llmService.js         # 大模型服务封装（Doubao/OpenAI SDK）
│   │   └── xunfeiSpeechService.js # 讯飞 WebSocket 语音封装
│   ├── config/
│   │   └── supabase.js           # Supabase 环境变量配置
│   └── supabase.js               # Supabase 客户端与常用方法
├── public/
├── package.json
├── vite.config.js
└── README.md
```
