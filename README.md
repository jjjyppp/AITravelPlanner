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

## 本地开发

### 配置 API Key

切记不要将任何 API Key 写入源码或提交到仓库。请使用以下安全方式配置：

使用 Vite 环境变量（推荐，不会被提交）
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
已在 GitHub 仓库中配置了应用所需的 secret，各 secret 的名称及其对应的说明如下：

**ACR_USERNAME**：阿里云容器镜像服务用户名
**ACR_PASSWORD**：ACR 密码
**VITE_AMAP_KEY**：高德地图 API key
**VITE_AMAP_SECURITY**：高德地图安全密钥
**VITE_LLM_API_KEY**：豆包 API key
**VITE_XF_APP_ID**：讯飞 App ID
**VITE_XF_API_KEY**：讯飞 API key
**VITE_XF_API_SECRET**：讯飞 API secret
**VITE_SUPABASE_URL**：Supabase URL
**VITE_SUPABASE_ANON_KEY**：Supabase anon key

可通过以下命令下载并运行 Docker 镜像

```bash
docker pull crpi-huvkrb3dhht5ae00.cn-shanghai.personal.cr.aliyuncs.com/jinyupan/aitravelplanner:latest
```

```bash
docker run --rm -p 8083:443 crpi-huvkrb3dhht5ae00.cn-shanghai.personal.cr.aliyuncs.com/jinyupan/aitravelplanner:latest
```

应用将在 https://localhost:8083 上运行（这是自签名证书，浏览器会有“不受信任”提示，选择继续访问即可）

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
