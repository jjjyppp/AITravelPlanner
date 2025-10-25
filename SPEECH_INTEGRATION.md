# 讯飞语音听写功能集成说明

## 概述

本项目已成功集成讯飞语音听写流式API，为用户提供语音输入功能。用户可以通过语音输入旅行需求，系统会自动识别并解析语音内容。

## 功能特性

- ✅ WebSocket连接和鉴权
- ✅ 实时语音识别
- ✅ 中文普通话支持
- ✅ 音频格式：PCM 16kHz 16bit 单声道
- ✅ 最长60秒录音时长
- ✅ 实时结果显示
- ✅ 错误处理和状态管理
- ✅ 响应式UI设计
- ✅ 动态修正功能（wpgs）
- ✅ 标点符号自动添加
- ✅ 音频帧优化传输（40ms间隔，1280B帧大小）
- ✅ 中英文混合识别

## 技术实现

### 1. 核心服务模块 (`src/services/speechService.js`)

- **SpeechRecognitionService类**：封装了所有语音识别相关功能
- **WebSocket连接**：使用wss协议连接讯飞API
- **鉴权机制**：基于HMAC-SHA256的签名认证
- **音频处理**：支持PCM格式音频录制和传输
- **帧优化传输**：40ms间隔，1280B帧大小，符合API规范
- **动态修正**：支持实时结果修正和替换
- **参数优化**：启用标点符号、中英文筛选等高级功能

### 2. 语音识别组件 (`src/components/SpeechRecognition.jsx`)

- **可复用组件**：可在任何页面中使用
- **状态管理**：连接、录音、识别等状态
- **回调函数**：支持结果和错误回调
- **UI反馈**：实时状态显示和错误提示

### 3. 测试组件 (`src/components/SpeechTest.jsx`)

- **功能测试**：专门用于测试语音识别功能
- **历史记录**：保存所有识别结果
- **使用说明**：详细的操作指导

## 集成位置

### 1. 首页 (`src/pages/HomePage.jsx`)
- 替换了原有的浏览器语音识别
- 支持语音输入旅行需求
- 自动解析语音内容并填充表单

### 2. 预算管理页 (`src/pages/BudgetPage.jsx`)
- 支持语音记录支出信息
- 自动识别金额和类别
- 简化数据录入流程

### 3. 语音测试页 (`/speech-test`)
- 专门用于测试语音识别功能
- 提供详细的使用说明
- 显示识别历史和状态

## API配置

```javascript
const XFYUN_CONFIG = {
  APPID: 'f7ae70c1',
  APIKey: '557206bc97aa567d51c22e37e2faa9b2',
  APISecret: 'NTdmOGIyNjU3MWNkYzQzOGNmNWFjZGNi',
  WS_URL: 'wss://iat-api.xfyun.cn/v2/iat'
}
```

## 使用方法

### 1. 基本使用

```jsx
import SpeechRecognition from '../components/SpeechRecognition'

function MyComponent() {
  const handleSpeechResult = (text) => {
    console.log('识别结果:', text)
  }

  const handleSpeechError = (error) => {
    console.error('识别错误:', error)
  }

  return (
    <SpeechRecognition
      onResult={handleSpeechResult}
      onError={handleSpeechError}
      placeholder="点击开始语音输入..."
    />
  )
}
```

### 2. 高级配置

```jsx
<SpeechRecognition
  onResult={handleSpeechResult}
  onError={handleSpeechError}
  placeholder="自定义提示文本"
  disabled={false}
  className="custom-class"
/>
```

## 浏览器兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

**注意**：需要HTTPS环境才能使用麦克风权限

## 安全考虑

1. **API密钥保护**：当前配置为示例，生产环境应使用环境变量
2. **HTTPS要求**：语音功能需要安全上下文
3. **权限管理**：需要用户授权麦克风权限
4. **数据隐私**：音频数据仅用于识别，不会存储

## 故障排除

### 常见问题

1. **连接失败**
   - 检查网络连接
   - 确认API密钥正确
   - 检查防火墙设置

2. **权限被拒绝**
   - 确保使用HTTPS
   - 检查浏览器麦克风权限
   - 尝试刷新页面重新授权

3. **识别效果差**
   - 确保在安静环境中使用
   - 说话清晰，语速适中
   - 检查麦克风设备

4. **WebSocket连接问题**
   - 检查浏览器WebSocket支持
   - 确认网络代理设置
   - 查看控制台错误信息

### 调试方法

1. 打开浏览器开发者工具
2. 查看Console面板的错误信息
3. 检查Network面板的WebSocket连接
4. 使用语音测试页面进行功能验证

## 开发说明

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问语音测试页面
http://localhost:5173/speech-test
```

### 生产部署

1. 确保使用HTTPS
2. 配置正确的API密钥
3. 测试所有语音功能
4. 监控WebSocket连接状态

## 更新日志

- **v1.1.0** (2024-12-19)
  - 优化音频传输：实现40ms间隔，1280B帧大小
  - 添加动态修正功能（wpgs）
  - 启用标点符号自动添加
  - 支持中英文混合识别
  - 改进结果处理逻辑
  - 优化错误处理和状态管理

- **v1.0.0** (2024-12-19)
  - 初始集成讯飞语音听写API
  - 实现基础语音识别功能
  - 添加语音测试页面
  - 集成到首页和预算管理页

## 技术支持

如有问题，请检查：
1. 浏览器控制台错误信息
2. 网络连接状态
3. API服务状态
4. 麦克风权限设置
