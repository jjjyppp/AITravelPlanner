import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SpeechRecognition from '../components/SpeechRecognition'

function HomePage() {
    // 旅行基本信息
    const [destination, setDestination] = useState('')
    const [days, setDays] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [travelers, setTravelers] = useState('')
    const [budget, setBudget] = useState('')
    
    // 日期相关状态已定义在上方
    
    const [preferences, setPreferences] = useState('')
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSpeechText, setCurrentSpeechText] = useState('')
  const navigate = useNavigate()

  // 处理语音识别结果
  const handleSpeechResult = (text, isReplace = false) => {
    // 更新当前识别结果显示
    setCurrentSpeechText(text)
    
    if (isReplace) {
      // 动态修正：替换当前输入框内容
      setNaturalLanguageInput(text)
    } else {
      // 追加结果到输入框
      setNaturalLanguageInput(prev => prev + text)
    }
    // 自动解析语音输入并填充表单
    parseNaturalLanguage(text)
  }

  // 处理语音识别错误
  const handleSpeechError = (error) => {
    console.error('语音识别错误:', error)
    alert('语音识别出错: ' + (error.message || '未知错误'))
  }

  // 解析自然语言输入（适用于文本和语音）
  const parseNaturalLanguage = (text) => {
    // 清理输入文本
    const cleanText = text.trim()
    
    // 提取目的地
    const destinationPatterns = [
      /(?:去|前往|到)([^，,。.\s]*)旅行?/,  // 例如：去日本旅行
      /我想去([^，,。.\s]*)/,             // 例如：我想去日本
      /目的地是?([^，,。.\s]*)/          // 例如：目的地是日本
    ]
    
    for (const pattern of destinationPatterns) {
      const match = cleanText.match(pattern)
      if (match && match[1]) {
        setDestination(match[1])
        break
      }
    }
    
    // 提取天数
    const daysMatch = cleanText.match(/(\d+)天/) || cleanText.match(/([一二三四五六七八九十]+)天/)
    if (daysMatch) {
      // 处理中文数字
      const numMap = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
      }
      if (numMap[daysMatch[1]]) {
        setDays(numMap[daysMatch[1]].toString())
      } else {
        setDays(daysMatch[1])
      }
    }
    
    // 提取预算
    const budgetMatch = cleanText.match(/预算(?:约|大约)?([^，,。.\s]*)/) || 
                       cleanText.match(/([^，,。.\s]*)元(?:预算)?/)
    if (budgetMatch && budgetMatch[1]) {
      setBudget(budgetMatch[1] + (budgetMatch[1].includes('元') ? '' : '元'))
    }
    
    // 提取人数
    const travelersMatch = cleanText.match(/(\d+)人/) || 
                          cleanText.match(/([一二三四五六七八九十]+)人/)
    if (travelersMatch) {
      // 处理中文数字
      const numMap = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
      }
      if (numMap[travelersMatch[1]]) {
        setTravelers(numMap[travelersMatch[1]].toString())
      } else {
        setTravelers(travelersMatch[1])
      }
    }
    
    // 提取偏好
    let extractedPreferences = []
    
    // 处理常见偏好词汇
    const preferencesKeywords = [
      /喜欢([^，,。.\s]*)/,            // 例如：喜欢美食
      /(美食|购物|历史|景点|文化|自然|海滩|山|博物馆|主题公园)/g, // 常见偏好词
      /(带孩子|亲子|家庭)/g,            // 家庭旅行相关
      /(动漫|游戏|电影|艺术|音乐)/g,     // 兴趣爱好相关
    ]
    
    preferencesKeywords.forEach(pattern => {
      const matches = cleanText.match(pattern)
      if (matches) {
        if (Array.isArray(matches) && matches.length > 1 && matches[1]) {
          extractedPreferences.push(matches[1])
        } else {
          // 处理全局匹配
          matches.forEach(match => {
            if (match && !extractedPreferences.includes(match)) {
              extractedPreferences.push(match)
            }
          })
        }
      }
    })
    
    // 去重并合并偏好
    if (extractedPreferences.length > 0) {
      const uniquePreferences = [...new Set(extractedPreferences)]
      setPreferences(uniquePreferences.join('、'))
    }
  }
  
  
  // 处理自然语言输入
  const handleNaturalLanguageInput = (e) => {
    const text = e.target.value
    setNaturalLanguageInput(text)
    
    // 如果输入不为空，尝试解析
    if (text.trim()) {
      parseNaturalLanguage(text)
    }
  }

  // 生成旅行计划
  const generateItinerary = async (e) => {
    e.preventDefault()
    
    // 检查用户是否至少填写了表单或自然语言输入
    if (!naturalLanguageInput.trim() && !destination) {
      alert('请填写旅行需求，可以通过表单填写或在自然语言输入框中描述')
      return
    }
    
    // 如果有自然语言输入，解析它
    if (naturalLanguageInput.trim()) {
      parseNaturalLanguage(naturalLanguageInput)
    }

    setLoading(true)

    try {
      // 计算日期范围的天数
      let daysValue = days || 3;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        daysValue = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 包括开始日期
      }
      
      // 构建旅行信息对象
      const travelInfo = {
        destination: destination,
        days: daysValue,
        people: 1, // 暂时设置默认值1
        budget: budget || '不限',
        preferences: preferences || '',
        startDate: startDate,
        endDate: endDate
      }
      
      // 导入LLMService
      const LLMService = (await import('../services/llmService.js')).default
      
      // 生成行程内容
      const itineraryContent = await LLMService.generateResponse(
        `请帮我生成具体的旅行规划，我的旅行需求为：\n目的地：${travelInfo.destination}\n天数：${travelInfo.days}天\n人数：${travelInfo.people}人\n预算：${travelInfo.budget}\n偏好：${travelInfo.preferences}`
      )
      
      setLoading(false)
      
      // 将行程内容存储在localStorage中，以便详情页访问
      localStorage.setItem('currentItineraryContent', itineraryContent)
      localStorage.setItem('currentTravelInfo', JSON.stringify(travelInfo))
      
      // 导航到行程详情页
      navigate(`/itinerary/1`)
    } catch (error) {
      setLoading(false)
      console.error('生成行程失败:', error)
      alert('生成行程失败，请稍后重试')
    }
  }

  return (
    <div className="home-page">
      {/* 英雄区域 */}
      <section className="hero-section">
        <h1>智能旅行规划，从这里开始</h1>
        <p>告诉我们你的旅行需求，AI将为你量身定制完美的旅行计划</p>
      </section>

      {/* 输入区域 */}
      <section className="input-section">
        <h2 className="mb-3">开始规划你的旅程</h2>
        
        <form onSubmit={generateItinerary}>
          {/* 旅行规划表单 - 移自TravelPlanner组件 */}
          <div className="travel-planner-form mb-4 p-4 border rounded shadow-sm bg-light">
            <h3 className="mb-2 text-primary">📝 填写旅行需求（可选）</h3>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label htmlFor="destination" className="form-label">目的地 **</label>
                <input
                  type="text"
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder=""
                  className="form-control"
                />
              </div>
              <div className="form-group col-md-6">
                <label htmlFor="travelers" className="form-label">人数 **</label>
                <input
                  type="number"
                  id="travelers"
                  value={travelers}
                  onChange={(e) => setTravelers(e.target.value)}
                  placeholder=""
                  className="form-control"
                  min="1"
                />
              </div>
            </div>
            
            <div className="form-row mt-3">
              <div className="form-group col-md-6">
                <label htmlFor="startDate" className="form-label">开始日期 **</label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group col-md-6">
                <label htmlFor="endDate" className="form-label">结束日期 **</label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control"
                  min={startDate}
                />
              </div>
            </div>
            
            <div className="form-row mt-3">
              <div className="form-group col-md-12">
                <label htmlFor="preferences" className="form-label">兴趣偏好</label>
                <input
                  type="text"
                  id="preferences"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder=""
                  className="form-control"
                />
              </div>
            </div>
            
            <div className="form-row mt-3">
              <div className="form-group col-md-12">
                <label htmlFor="budget" className="form-label">预算范围</label>
                <input
                  type="text"
                  id="budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder=""
                  className="form-control"
                />
              </div>
            </div>
          </div>
          
          {/* 自然语言输入框 */}
          <div className="mb-3">
            <h3 className="mb-2">💬 或用自然语言描述（可选）</h3>
            <textarea
              id="naturalLanguage"
              value={naturalLanguageInput}
              onChange={handleNaturalLanguageInput}
              placeholder="请用一句话描述您的旅行需求，例如：我想去日本，5天，预算1万元，喜欢美食和动漫，带孩子"
              rows="4"
              className="form-control natural-language-input"
            />
            <div className="input-hint mt-1">
              💡 提示：可以选择填写表单，或使用自然语言描述，或两者结合
            </div>
          </div>
          
          {/* 语音输入区域 */}
          <div className="mb-3">
            <SpeechRecognition
              onResult={handleSpeechResult}
              onError={handleSpeechError}
              placeholder="点击开始语音输入您的旅行需求..."
            />
            
            {/* 实时识别结果显示 */}
            {currentSpeechText && (
              <div className="speech-realtime-result">
                <div className="result-label">🎙️ 实时识别：</div>
                <div className="result-text">{currentSpeechText}</div>
              </div>
            )}
          </div>
          
          <button 
            type="submit" 
            className="primary-button"
            disabled={loading}
          >
            {loading ? '生成中...' : '生成行程计划'}
          </button>
        </form>
      </section>

      {/* 特性介绍 */}
      <section className="features-section mb-3">
        <h2 className="text-center mb-3">AI旅行规划师的优势</h2>
        <div className="itinerary-results">
          <div className="card">
            <h3>智能个性化</h3>
            <p>基于您的偏好、预算和时间，AI算法为您生成最适合的旅行计划</p>
          </div>
          <div className="card">
            <h3>语音交互</h3>
            <p>支持语音输入，让您可以轻松表达复杂的旅行需求</p>
          </div>
          <div className="card">
            <h3>预算管理</h3>
            <p>详细的费用预算和追踪，帮助您控制旅行支出</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage