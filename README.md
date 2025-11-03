# AI 旅行规划师 (AI Travel Planner)

一个基于React的智能旅行规划应用，通过AI技术帮助用户快速规划旅行行程，管理预算，并提供实时旅行辅助。

## 核心功能

1. **智能行程规划**：支持文字和语音输入旅行需求（目的地、日期、预算、人数、偏好），AI自动生成个性化旅行路线
2. **费用预算与管理**：AI进行预算分析，记录旅行开销（支持语音输入）
3. **用户管理与数据存储**：用户可以注册登录，保存和管理多份旅行计划，实现云端同步
4. **AI 旅行规划增强**：集成大语言模型提供更智能、详细的行程规划和预算估计

## 技术栈

- **前端框架**：React 19
- **UI组件库**：Material-UI (@mui/material)
- **路由管理**：React Router
- **图表可视化**：Chart.js + react-chartjs-2
- **样式处理**：CSS变量 + 响应式设计
- **语音识别**：讯飞语音识别 API
- **大语言模型**：火山引擎doubao API
- **认证和数据库**：Supabase API
- **地图路线**：高德地图 API

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

## Docker 部署
可通过以下命令下载并运行 docker image

```bash
docker pull crpi-huvkrb3dhht5ae00.cn-shanghai.personal.cr.aliyuncs.com/jinyupan/aitravelplanner:latest
```

```bash
docker run --rm -p 80:80 crpi-huvkrb3dhht5ae00.cn-shanghai.personal.cr.aliyuncs.com/jinyupan/aitravelplanner:latest
```

应用将在 http://localhost:80 上运行。

## 项目结构

```
.
├── src/
│   ├── App.jsx                  # 根组件
│   ├── main.jsx                 # 入口文件
│   ├── index.css                # 全局样式
│   ├── App.css                  # 应用样式与行程卡片样式
│   ├── assets/                  # 静态资源
│   ├── components/
│   │   ├── MapSection.jsx       # 地图：标注名称、折线、按天切换、fitView
│   │   ├── SpeechRecognition.jsx# 语音输入组件（科大讯飞 WebSocket）
│   │   └── SpeechRecognition.css
│   ├── contexts/
│   │   ├── AuthContext.jsx      # 认证上下文
│   │   └── ItineraryContext.jsx # 行程 CRUD 封装（含 route_points 持久化）
│   ├── pages/
│   │   ├── HomePage.jsx         # 首页：表单/自然语言/语音入口
│   │   ├── AIItineraryPage.jsx  # AI 生成页：一次性渲染、地图预览、保存行程
│   │   ├── ItineraryDetailPage.jsx # 行程详情：地图+“每日卡片”视图（支持 route_points）
│   │   ├── MyTripsPage.jsx      # 我的行程列表
│   │   ├── ExpensePage.jsx      # 旅行开销：新增/删除/编辑+分类统计
│   │   ├── LoginPage.jsx        # 登录
│   │   └── RegisterPage.jsx     # 注册
│   ├── services/
│   │   ├── llmService.js        # 大模型服务封装（Doubao/OpenAI SDK）
│   │   └── xunfeiSpeechService.js # 讯飞 WebSocket 语音封装
│   ├── config/
│   │   └── supabase.js          # Supabase 环境变量配置
│   └── supabase.js              # Supabase 客户端与常用方法
├── public/
├── package.json
├── vite.config.js
└── README.md
```
