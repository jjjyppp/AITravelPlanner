/**
 * 大语言模型服务
 * 用于行程规划和费用预算估计
 */

import OpenAI from 'openai';

// 延迟创建OpenAI客户端，避免在模块加载阶段抛错导致白屏
let _openaiClient = null;

const example = `
### 一、每日行程安排

#### 10 月 1 日：东京

- **上午**：

- ​	**08:00 - 10:00**：抵达东京成田机场，办理入境手续，领取行李。

- ​	**10:00 - 12:00**：乘坐机场快线抵达东京市区，前往酒店办理入住，稍作休息。

- **中午**：

- ​	**12:00 - 13:30**：在酒店附近餐厅用餐。

- **下午**：

- ​	**13:30 - 16:00**：前往东京塔，俯瞰东京市区全景，了解东京的城市发展历史。

- ​	**16:00 - 18:00**：漫步东京塔周边街区，感受东京的街头文化。

- **晚上**：

- ​	**18:00 - 20:00**：在东京塔附近的餐厅享用晚餐，品尝日本特色美食。

### 二、景点信息

**东京塔**

- **介绍**：东京的地标性建筑，高 333 米，是世界第三高的自立式铁塔，可俯瞰东京市区全景。

- **开放时间**：09:00 - 23:00。

- **门票价格**：大展望台成人 1600 日元，特别展望台成人 3000 日元。

- **游览建议**：建议在傍晚时分前往，可同时欣赏白天和夜晚的东京景色。

### 三、住宿推荐

**东京住宿**：东京湾希尔顿酒店

- **位置**：位于东京台场地区。

- **价格区间**：每晚约 2500 - 3500 元人民币（5 人可考虑预订家庭房或套房）。

- **特色**：酒店设施齐全，可俯瞰东京湾美景，周边交通便利，购物、餐饮场所众多。

- **预订建议**：提前在各大旅行预订平台预订，关注是否有优惠活动。



### 四、餐厅推荐

**东京**：

- **1. 蟹道乐（银座店）**

- ​	**特色菜品**：各类螃蟹料理，如烤蟹、蟹火锅等。

- ​	**人均消费**：约 3000 日元。

- ​	**位置**：东京都中央区银座 5 - 5 - 1 东急PLAZA 银座 7 楼。

- **2. 瓢亭**

- ​	**特色菜品**：京料理，如精进料理、会席料理等。

- ​	**人均消费**：约 10000 日元。

- ​	**位置**：京都市左京区南禅寺草川町 35。

- 

### 五、交通建议

**抵达目的地的大交通建议**：乘坐飞机抵达东京成田机场，从出发地预订直飞东京成田机场的航班，提前预订可获得较为优惠的价格。 

**当地交通详细方案**：

- **东京**：可购买东京地铁通票，1 日券 1500 日元，2 日券 2700 日元，3 日券 3800 日元，运营时间一般为 05:00 - 01:00 左右。可乘坐地铁前往各个景点。

- **京都**：可购买京都巴士一日券，成人 600 日元，运营时间一般为 06:00 - 22:00 左右。大部分景点可通过巴士到达。

**景点间的最优交通方式**：

- **东京**：景点间乘坐地铁最为便捷，按照地铁线路指示即可。

- **京都**：金阁寺、二条城、清水寺等景点可乘坐巴士前往，祇园花见小路可步行或乘坐人力车游览周边。

### 六、费用估算（5 人总计约 1 万元，以下为大致估算）

**交通费用**：

- **机票**：约 5000 元（根据出发地不同有所波动）。

- **日本国内交通**：东京地铁通票 + 京都巴士一日券等，约 2000 元。

**住宿费用**：东京 2 晚 + 京都 1 晚，约 3000 元。 

**餐饮费用**：约 2000 元（包含特色餐厅及日常简餐）。 

**景点门票费用**：约 1000 元。

### 七、实用小贴士

**当地习俗**：在日本要注意礼仪，如进出房间要脱鞋，乘坐公共交通要保持安静，在餐厅吃饭时不要大声喧哗。给服务人员小费可能会被视为不礼貌行为。

**天气注意事项**：10 月的日本天气较为凉爽，早晚温差较大，建议携带外套。 

**必备物品**：护照、日元现金、转换插头、雨伞、舒适的鞋子等。
`

function getOpenAIClient() {
  if (!_openaiClient) {
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_LLM_API_KEY) || ''
    const apiKey = envKey
    _openaiClient = new OpenAI({
      apiKey, // 从本地存储或环境变量读取，不要硬编码
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      dangerouslyAllowBrowser: true, // 允许在浏览器环境中运行
    });
  }
  return _openaiClient;
}

/**
 * 大语言模型服务类
 */
class LLMService {
  /**
   * 生成行程规划
   * @param {Object} tripInfo 旅行信息
   * @param {string} tripInfo.destination 目的地
   * @param {string} tripInfo.startDate 开始日期
   * @param {string} tripInfo.endDate 结束日期
   * @param {number} tripInfo.personCount 人数
   * @param {string[]} tripInfo.interests 兴趣偏好
   * @param {string} tripInfo.budget 预算范围
   * @param {function} onProgress 进度回调函数
   * @param {string} naturalLanguageInput 自然语言输入
   * @returns {Promise<string>} 行程规划文本
   */
  static async generateItinerary(tripInfo, onProgress = null) {
    const { destination, startDate, endDate, personCount, interests, budget, naturalLanguageInput } = tripInfo;
    
    const prompt = `请帮我规划一次从${startDate}到${endDate}的${destination}之旅，` +
      `共${personCount}人，` +
      `我们对${interests.join('、')}等方面感兴趣，` +
      `预算范围是${budget}, ${naturalLanguageInput}中是我更多的补充信息。

` +
      `请提供以下内容：
` +
      `1. 详细的每日行程安排，包括推荐景点、活动和用餐建议
` +
      `2. 交通建议和路线规划
` +
      `3. 住宿推荐
` +
      `4. 实用的旅行小贴士
` +
      `5. 预计费用明细

请用中文回复，内容要具体、实用，适合实际旅行参考。请严格参考${example}的格式输出，各分点使用无序列表输出，不要使用有序列表`;

const promptAddon = `
      请在全文末尾追加一个仅包含路线点位的 JSON 代码块（使用\`\`\`json 包裹），且必须包含 "route_points" 字段（即使为空也输出 "route_points": []）。
      - route_points 为数组，元素为对象；每个对象至少包含：title(字符串)、lng(数字)、lat(数字)、day(数字)、time(字符串，24 小时制区间，如 "HH:MM-HH:MM")。可选：order(数字)、detail(字符串)、start_time/end_time(字符串)。
      - lng/lat 为数值，表示当前点位的经纬度坐标，lng 为经度，取值范围 [-180,180]，lat 为纬度，取值范围 [-90,90]。
      - 点位顺序需与行程日程、时间顺序一致。

      示例：
      \`\`\`json
      {
        "route_points": [
          { "title": "示例景点", "lng": 116.3974, "lat": 39.9093, "day": 1, "time": "09:00-10:30", "order": 1, "detail": "1-2 句具体说明" }
        ]
      }
      \`\`\`
      `;

    if (onProgress) {
      // 流式响应
      return this.generateStreamResponse(prompt + promptAddon, onProgress);
    } else {
      // 非流式响应
      return this.generateResponse(prompt + promptAddon);
    }
  }

  /**
   * 生成费用预算估计
   * @param {Object} budgetInfo 预算信息
   * @param {string} budgetInfo.destination 目的地
   * @param {string} budgetInfo.duration 旅行天数
   * @param {number} budgetInfo.personCount 人数
   * @param {string} budgetInfo.travelSeason 旅行季节
   * @param {string} budgetInfo.accommodationLevel 住宿标准
   * @param {function} onProgress 进度回调函数
   * @returns {Promise<string>} 预算估计文本
   */
  static async estimateBudget(budgetInfo, onProgress = null) {
    const { destination, duration, personCount, travelSeason, accommodationLevel } = budgetInfo;
    
    const prompt = `请帮我估算${personCount}人在${travelSeason}前往${destination}旅行${duration}天的费用预算，` +
      `住宿标准为${accommodationLevel}。

` +
      `请提供以下费用明细：
` +
      `1. 交通费用（往返机票/火车票）
` +
      `2. 住宿费用
` +
      `3. 餐饮费用
` +
      `4. 景点门票和活动费用
` +
      `5. 当地交通费用
` +
      `6. 购物和其他个人消费
` +
      `7. 小费和杂费
` +
      `8. 总费用估算

请用中文回复，提供详细的费用明细和节省费用的建议。`;

    if (onProgress) {
      // 流式响应
      return this.generateStreamResponse(prompt, onProgress);
    } else {
      // 非流式响应
      return this.generateResponse(prompt);
    }
  }

  /**
   * 生成普通响应
   * @param {string} prompt 提示文本
   * @returns {Promise<string>} 模型响应
   */
  static async generateResponse(prompt) {
    try {
      const completion = await getOpenAIClient().chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ],
        model: 'doubao-1-5-pro-256k-250115',
        reasoning_effort: "medium",
      });

      // 只返回最终结果，不包含思考过程
      let response = '';
      if (completion.choices[0]?.message?.content) {
        response += completion.choices[0].message.content;
      }

      return response;
    } catch (error) {
      console.error('大语言模型调用失败:', error);
      throw new Error('行程规划生成失败，请稍后重试');
    }
  }

  /**
   * 生成流式响应
   * @param {string} prompt 提示文本
   * @param {function} onProgress 进度回调
   * @returns {Promise<string>} 完整响应文本
   */
  static async generateStreamResponse(prompt, onProgress) {
    try {
      const stream = await getOpenAIClient().chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ],
        model: 'doubao-1-5-pro-256k-250115',
        reasoning_effort: "medium",
        stream: true,
      });

      let fullResponse = '';
      let currentResponse = '';

      for await (const part of stream) {
        // 只处理最终结果内容，忽略思考过程
        const content = part.choices[0]?.delta?.content || '';
        
        fullResponse += content;
        currentResponse += content;
        
        // 每累积一定字符或遇到特定标点符号时回调
        if (currentResponse.length >= 30 || 
            ['.', '。', '!', '！', '?', '？', ';', '；'].includes(currentResponse.slice(-1))) {
          onProgress(currentResponse);
          currentResponse = '';
        }
      }

      // 确保最后一部分也被回调
      if (currentResponse) {
        onProgress(currentResponse);
      }

      return fullResponse;
    } catch (error) {
      console.error('大语言模型流式调用失败:', error);
      throw new Error('行程规划生成失败，请稍后重试');
    }
  }

  /**
   * 分析旅行需求
   * @param {string} userInput 用户输入的旅行需求描述
   * @returns {Promise<Object>} 结构化的旅行信息
   */
  static async analyzeTravelRequirements(userInput) {
    const prompt = `请分析以下用户的旅行需求描述，并提取关键信息，以JSON格式返回：

用户描述：${userInput}

请提取的信息包括：
- destination: 目的地
- startDate: 开始日期（如果有）
- endDate: 结束日期（如果有）
- duration: 旅行天数（如果没有具体日期但有天数）
- personCount: 人数
- interests: 兴趣偏好（数组形式）
- budget: 预算范围
- accommodationLevel: 住宿标准
- travelSeason: 旅行季节

如果某些信息在描述中不存在，请使用null表示。
只返回JSON，不要包含其他说明文字。`;

    try {
      const completion = await getOpenAIClient().chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ],
        model: 'doubao-1-5-pro-256k-250115',
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(responseText);
    } catch (error) {
      console.error('需求分析失败:', error);
      throw new Error('无法分析您的旅行需求，请提供更详细的信息');
    }
  }
}

export default LLMService;
