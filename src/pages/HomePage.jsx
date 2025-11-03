import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SpeechRecognition from '../components/SpeechRecognition'
import LLMService from '../services/llmService'
import { useAuth } from '../contexts/AuthContext'

function HomePage() {
  const [destination, setDestination] = useState('')
  const [days, setDays] = useState('')
  const [budget, setBudget] = useState('')
  const [travelers, setTravelers] = useState('')
  const [preferences, setPreferences] = useState('')
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSpeechText, setCurrentSpeechText] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  // 提交后用于清空所有输入的重置函数
  const resetForm = () => {
    try { localStorage.removeItem('homeDraft') } catch {}
    setDestination('')
    setDays('')
    setBudget('')
    setTravelers('')
    setPreferences('')
    setNaturalLanguageInput('')
    setCurrentSpeechText('')
    setStartDate('')
    setEndDate('')
  }

  // 恢复草稿（用于登录后返回首页保留输入）
  useEffect(() => {
    try {
      const draftRaw = localStorage.getItem('homeDraft')
      if (draftRaw) {
        const d = JSON.parse(draftRaw)
        if (typeof d === 'object' && d) {
          setDestination(d.destination || '')
          setTravelers(d.travelers || '')
          setStartDate(d.startDate || '')
          setEndDate(d.endDate || '')
          setPreferences(d.preferences || '')
          setBudget(d.budget || '')
          setNaturalLanguageInput(d.naturalLanguageInput || '')
        }
      }
    } catch {}
  }, [])

  // 处理语音识别结果
  const handleSpeechResult = (text, isReplace = false) => {
    setCurrentSpeechText(text)
    if (isReplace) {
      setNaturalLanguageInput(text)
    } else {
      setNaturalLanguageInput(prev => (prev ? (prev + ' ' + text) : text))
    }
    parseNaturalLanguage(text)
  }

  // 处理语音识别错误
  const handleSpeechError = (error) => {
    console.error('语音识别错误:', error)
    alert('语音识别出错: ' + (error.message || '未知错误'))
  }

  // 解析自然语言输入（文本/语音）并回填选择器
  const parseNaturalLanguage = (text) => {
    const clean = (text || '').trim()
    if (!clean) return

    // 简单中文数字映射
    const cnNum = {
      '一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10
    }

    // 目的地
    const destPatterns = [
      /(?:我想去|我要去|打算去|计划去|去|前往|到|目的地(?:是|为)?)([\u4e00-\u9fa5A-Za-z\s]{1,20})/u
    ]
    for (const p of destPatterns) {
      const m = clean.match(p)
      if (m && m[1]) {
        const val = m[1].replace(/[，。\.\s]/g, '').trim()
        if (val) { setDestination(val) }
        break
      }
    }

    // 人数
    const peopleNum = (() => {
      const m1 = clean.match(/(\d+)\s*人/)
      if (m1) return m1[1]
      const m2 = clean.match(/([一二两三四五六七八九十])\s*人/)
      if (m2) return String(cnNum[m2[1]] || '')
      return ''
    })()
    if (peopleNum) setTravelers(peopleNum)

    // 日期（YYYY-MM-DD 提取前两个作为起止）
    const isoDates = clean.match(/\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b/g)
    if (isoDates && isoDates.length > 0) {
      const norm = (d) => d.replace(/\//g, '-').replace(/-(\d)(?!\d)/g, '-0$1')
      if (!startDate) setStartDate(norm(isoDates[0]))
      if (isoDates[1] && !endDate) setEndDate(norm(isoDates[1]))
    } else {
      // 简单的 “从X到Y” 自然表达（仅提取数字月日，填充当前年）
      const md = clean.match(/从?(\d{1,2})月(\d{1,2})日?到(\d{1,2})月(\d{1,2})日?/)
      if (md) {
        const year = new Date().getFullYear()
        const s = `${year}-${String(md[1]).padStart(2,'0')}-${String(md[2]).padStart(2,'0')}`
        const e = `${year}-${String(md[3]).padStart(2,'0')}-${String(md[4]).padStart(2,'0')}`
        if (!startDate) setStartDate(s)
        if (!endDate) setEndDate(e)
      }
    }

    // 天数（可选）
    const d1 = clean.match(/(\d+)\s*天/)
    const d2 = clean.match(/([一二三四五六七八九十])\s*天/)
    if (d1) setDays(d1[1])
    else if (d2) setDays(String(cnNum[d2[1]] || ''))

    // 预算
    const b1 = clean.match(/预算(?:约|大约|大概|在)?\s*([0-9\.]+\s*(?:元|人民币|块|RMB|万元|万)?)/)
    if (b1 && b1[1]) setBudget(b1[1])

    // 兴趣偏好关键词
    const prefKeywords = /(美食|购物|历史|景点|文化|自然|海滩|山|博物馆|主题公园|亲子|家庭|动漫|游戏|电影|艺术|音乐)/g
    const found = clean.match(prefKeywords) || []
    if (found.length) setPreferences(Array.from(new Set(found)).join('、'))
  }

  // 处理自然语言输入
  const handleNaturalLanguageInput = (e) => {
    const text = e.target.value
    setNaturalLanguageInput(text)
    if (text.trim()) {
      parseNaturalLanguage(text)
    }
  }

  // 统一的生成逻辑（单一按钮）
  const handleGenerate = async () => {
    // 未登录：保存草稿并跳转登录
    if (!user) {
      try {
        const draft = {
          destination,
          travelers,
          startDate,
          endDate,
          preferences,
          budget,
          naturalLanguageInput,
        }
        localStorage.setItem('homeDraft', JSON.stringify(draft))
      } catch {}
      navigate('/login', { state: { redirectTo: '/' } })
      return
    }

    // 校验必填
    if (!destination.trim() || !travelers.trim() || !startDate.trim() || !endDate.trim()) {
      alert('您还有必填项没有填写')
      return
    }

    setLoading(true)
    try {
      const tripInfo = {
      
        destination: destination.trim(),
        startDate: startDate.trim() || '未指定',
        endDate: endDate.trim() || '未指定',
        personCount: Number(travelers) || travelers || 1,
        interests: preferences ? preferences.split(/[、,，]/).map(p => p.trim()).filter(Boolean) : ['未指定'],
        budget: budget || '未指定',
        naturalLanguageInput: naturalLanguageInput
      }
      navigate('/ai-itinerary', { state: { itineraryForm: tripInfo } })
      // 导航后清空表单，避免返回时残留
      resetForm()
    } finally {
      setLoading(false)
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
        <h2 className="mb-3">开始规划你的旅行</h2>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* 选择器（与自然语言输入在一起） */}
          <div className="form-container">
            {/* <h3 className="mb-3">补充或修改你的旅行需求</h3> */}

            <div className="form-row">
              <div className="form-group col-md-6">
                <label htmlFor="destination" className="form-label">目的地*</label>
                <input
                  type="text"
                  id="destination"
                  value={destination}
                  inputMode="text"
                  pattern="[^0-9]*"
                  onChange={(e) => { const v = (e.target.value || '').replace(/[0-9]/g, ''); setDestination(v) }}
                  placeholder="例如：日本/北京/三亚"
                  className="form-control"
                />
              </div>
              <div className="form-group col-md-6">
                <label htmlFor="travelers" className="form-label">人数*</label>
                <input
                  type="number"
                  id="travelers"
                  value={travelers}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  step="1"
                  onChange={(e) => { const v = (e.target.value || '').replace(/\\D/g, ''); setTravelers(v) }}
                  placeholder="例如：2"
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-row mt-3">
              <div className="form-group col-md-6">
                <label htmlFor="startDate" className="form-label">开始日期*</label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => { const v = e.target.value; setStartDate(v); if (endDate && v && endDate < v) { setEndDate(v) } }}
                  className="form-control"
                />
              </div>
              <div className="form-group col-md-6">
                <label htmlFor="endDate" className="form-label">结束日期*</label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control"
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
                  placeholder="例如：美食、亲子、自然"
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-row mt-3">
              <div className="form-group col-md-12">
                <label htmlFor="budget" className="form-label">旅行预算</label>
                <input
                  type="number"
                  id="budget"
                  value={budget}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  step="1"
                  onChange={(e) => { const v = (e.target.value || '').replace(/\\D/g, ''); setBudget(v) }}
                  placeholder="例如：1000"
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* 自然语言描述 */}
          <div className="mb-3 mt-4">
            <label className="mb-2">语音或手动输入</label>
            <textarea
              id="naturalLanguage"
              value={naturalLanguageInput}
              onChange={handleNaturalLanguageInput}
              placeholder="例如：我想去日本，3天，预算1万元，亲子游，5人，7月1日到7月3日"
              rows="4"
              className="natural-language-input"
            />
            <div className="input-hint mt-1">
              提示：尽量包含目的地、人数、开始日期、天数/结束日期、预算与偏好。
            </div>
          </div>

          {/* 语音输入区域 */}
          <div className="mb-3">
            <SpeechRecognition
              onResult={handleSpeechResult}
              onError={handleSpeechError}
              placeholder="点击开始语音输入您的旅行需求..."
            />
          </div>

          {/* 单一生成按钮 */}
          <div className="text-center mt-4">
            <button
              type="button"
              className="primary-button"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? '生成中...' : '生成行程计划'}
            </button>
            <div className="input-hint mt-1" style={{ color: 'var(--text-secondary)' }}>
              目的地、人数、开始日期、结束日期为必填项
            </div>
          </div>
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
