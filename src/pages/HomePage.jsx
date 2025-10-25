import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function HomePage() {
  const [destination, setDestination] = useState('')
  const [days, setDays] = useState('')
  const [budget, setBudget] = useState('')
  const [travelers, setTravelers] = useState('')
  const [preferences, setPreferences] = useState('')
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [speechText, setSpeechText] = useState('')
  const navigate = useNavigate()

  // 语音识别功能
  const startVoiceRecognition = () => {
    setIsRecording(true)
    setSpeechText('正在聆听...')

    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器。')
      setIsRecording(false)
      setSpeechText('')
      return
    }

    // 创建语音识别实例
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'zh-CN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    // 识别结果处理
    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript
      setSpeechText(speechResult)
      
      // 尝试解析语音输入并填充表单
      parseSpeechInput(speechResult)
    }

    // 识别结束处理
    recognition.onend = () => {
      setIsRecording(false)
    }

    // 识别错误处理
    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error)
      setIsRecording(false)
      setSpeechText('语音识别出错，请重试')
    }

    // 开始语音识别
    recognition.start()
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
  
  // 解析语音输入（调用通用解析函数）
  const parseSpeechInput = (text) => {
    parseNaturalLanguage(text)
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
  const generateItinerary = (e) => {
    e.preventDefault()
    
    if (!naturalLanguageInput.trim()) {
      alert('请在自然语言输入框中描述您的旅行需求')
      return
    }
    
    // 解析用户输入的自然语言内容
    parseNaturalLanguage(naturalLanguageInput)

    setLoading(true)

    // 模拟API调用延迟
    setTimeout(() => {
      setLoading(false)
      // 创建一个模拟的行程ID并导航到行程详情页
      const mockItineraryId = '1'
      navigate(`/itinerary/${mockItineraryId}`)
    }, 2000)
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
          {/* 仅保留自然语言输入框 */}
          <div className="mb-3">
            <textarea
              id="naturalLanguage"
              value={naturalLanguageInput}
              onChange={handleNaturalLanguageInput}
              placeholder="请用一句话描述您的旅行需求，例如：我想去日本，5天，预算1万元，喜欢美食和动漫，带孩子"
              rows="4"
              className="natural-language-input"
              required
            />
            <div className="input-hint mt-1">
              💡 提示：请尽量包含目的地、天数、预算、人数和旅行偏好等信息，以便我们生成更符合您期望的旅行计划
            </div>
          </div>
          
    
          
          {/* 语音输入区域 */}
          <div className="mb-3">
            <button 
              type="button"
              className={`voice-input-button ${isRecording ? 'recording' : ''}`}
              onClick={startVoiceRecognition}
              disabled={isRecording}
            >
              {isRecording ? '🎙️ 正在录音...' : '🎙️ 使用语音输入需求'}
            </button>
            {speechText && (
              <p className="mt-2">识别结果: {speechText}</p>
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