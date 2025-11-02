/**
 * 大语言模型服务
 * 用于行程规划和费用预算估计
 */

import OpenAI from 'openai';

// 延迟创建OpenAI客户端，避免在模块加载阶段抛错导致白屏
let _openaiClient = null;
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
   * @returns {Promise<string>} 行程规划文本
   */
  static async generateItinerary(tripInfo, onProgress = null) {
    const { destination, startDate, endDate, personCount, interests, budget } = tripInfo;
    
    const prompt = `请帮我规划一次从${startDate}到${endDate}的${destination}之旅，` +
      `共${personCount}人，` +
      `我们对${interests.join('、')}等方面感兴趣，` +
      `预算范围是${budget}。

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

请用中文回复，内容要具体、实用，适合实际旅行参考。`;

    if (onProgress) {
      // 流式响应
      return this.generateStreamResponse(prompt, onProgress);
    } else {
      // 非流式响应
      return this.generateResponse(prompt);
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
        model: 'doubao-seed-1-6-251015',
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
        model: 'doubao-seed-1-6-251015',
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
        model: 'doubao-seed-1-6-251015',
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
