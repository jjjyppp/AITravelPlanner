import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

function BudgetPage({ isLoggedIn }) {
  const [expenses, setExpenses] = useState([
    { id: 1, category: '餐饮', amount: 350, date: '2024-06-10', tripId: '1' },
    { id: 2, category: '交通', amount: 200, date: '2024-06-10', tripId: '1' },
    { id: 3, category: '购物', amount: 800, date: '2024-06-11', tripId: '1' },
    { id: 4, category: '住宿', amount: 600, date: '2024-06-10', tripId: '1' },
    { id: 5, category: '门票', amount: 450, date: '2024-06-11', tripId: '1' }
  ])
  const [newExpense, setNewExpense] = useState({
    category: '餐饮',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    tripId: '1',
    notes: ''
  })
  const [isRecording, setIsRecording] = useState(false)
  const [activeTrip, setActiveTrip] = useState('1')

  // 模拟的行程选项
  const tripOptions = [
    { value: '1', label: '日本东京 - 5日游' },
    { value: '2', label: '泰国曼谷 - 4日游' },
    { value: '3', label: '法国巴黎 - 7日游' }
  ]

  // 支出类别选项
  const categories = ['餐饮', '交通', '住宿', '门票', '购物', '其他']

  // 处理语音记录支出
  const startVoiceRecording = () => {
    setIsRecording(true)
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能')
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'zh-CN'
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript
      parseExpenseVoiceInput(speechResult)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.onerror = () => {
      setIsRecording(false)
    }

    recognition.start()
  }

  // 解析语音输入的支出信息
  const parseExpenseVoiceInput = (text) => {
    // 简单的正则表达式匹配金额和类别
    const amountMatch = text.match(/(\d+(?:\.\d+)?)元?/)
    const categoryMatch = categories.find(cat => text.includes(cat))
    
    if (amountMatch) {
      setNewExpense(prev => ({
        ...prev,
        amount: amountMatch[1]
      }))
    }
    
    if (categoryMatch) {
      setNewExpense(prev => ({
        ...prev,
        category: categoryMatch
      }))
    }
    
    // 自动添加备注
    setNewExpense(prev => ({
      ...prev,
      notes: text
    }))
  }

  // 添加新支出
  const addExpense = (e) => {
    e.preventDefault()
    
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      alert('请输入有效金额')
      return
    }

    const expense = {
      id: Date.now(),
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      date: newExpense.date,
      tripId: newExpense.tripId,
      notes: newExpense.notes
    }

    setExpenses([...expenses, expense])
    
    // 重置表单
    setNewExpense({
      category: '餐饮',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      tripId: activeTrip,
      notes: ''
    })
  }

  // 删除支出
  const deleteExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id))
  }

  // 过滤当前行程的支出
  const filteredExpenses = expenses.filter(expense => expense.tripId === activeTrip)

  // 计算总支出
  const totalExpense = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  // 按类别统计支出
  const expensesByCategory = categories.map(category => {
    const amount = filteredExpenses
      .filter(expense => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0)
    return { category, amount }
  }).filter(item => item.amount > 0)

  // 渲染支出图表
  const renderExpenseChart = () => {
    const data = {
      labels: expensesByCategory.map(item => item.category),
      datasets: [
        {
          label: '支出金额 (元)',
          data: expensesByCategory.map(item => item.amount),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
            'rgba(255, 159, 64, 0.5)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }
      ]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        title: {
          display: true,
          text: '支出分类统计'
        }
      }
    }

    return <Bar data={data} options={options} />
  }

  if (!isLoggedIn) {
    return (
      <div className="auth-required">
        <div className="card text-center">
          <h2>请先登录</h2>
          <p className="mb-3">登录后可以管理您的旅行预算</p>
          <Link to="/login">
            <button>前往登录</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="budget-page">
      <h2>预算管理</h2>
      
      {/* 行程选择器 */}
      <div className="card mb-3">
        <label htmlFor="tripSelect">选择行程</label>
        <select
          id="tripSelect"
          value={activeTrip}
          onChange={(e) => setActiveTrip(e.target.value)}
        >
          {tripOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 添加支出表单 */}
      <div className="card mb-3">
        <h3>记录支出</h3>
        <form onSubmit={addExpense}>
          <div className="input-group">
            <div>
              <label htmlFor="category">类别</label>
              <select
                id="category"
                value={newExpense.category}
                onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="amount">金额 (元)</label>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="输入金额"
                required
              />
            </div>
            <div>
              <label htmlFor="date">日期</label>
              <input
                type="date"
                id="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="mb-2">
            <label htmlFor="notes">备注</label>
            <textarea
              id="notes"
              value={newExpense.notes}
              onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="添加备注信息"
              rows="2"
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit">添加支出</button>
            <button 
              type="button"
              className={`voice-input-button ${isRecording ? 'recording' : ''}`}
              onClick={startVoiceRecording}
              disabled={isRecording}
            >
              {isRecording ? '🎙️ 正在录音...' : '🎙️ 语音记录'}
            </button>
          </div>
        </form>
      </div>

      {/* 支出统计和图表 */}
      <div className="card mb-3">
        <h3>支出统计</h3>
        <p>总支出: <strong style={{ color: 'var(--primary-color)' }}>{totalExpense.toFixed(2)} 元</strong></p>
        <div className="budget-chart">
          {expensesByCategory.length > 0 ? renderExpenseChart() : <p>暂无支出数据</p>}
        </div>
      </div>

      {/* 支出明细 */}
      <div className="card">
        <h3>支出明细</h3>
        {filteredExpenses.length === 0 ? (
          <p>暂无支出记录</p>
        ) : (
          <div className="expenses-table">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              <div>类别</div>
              <div>金额</div>
              <div>日期</div>
              <div>备注</div>
              <div>操作</div>
            </div>
            {filteredExpenses.map(expense => (
              <div key={expense.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '1rem', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                <div>{expense.category}</div>
                <div>{expense.amount.toFixed(2)} 元</div>
                <div>{expense.date}</div>
                <div>{expense.notes || '-'}</div>
                <div>
                  <button 
                    onClick={() => deleteExpense(expense.id)}
                    style={{ 
                      backgroundColor: 'var(--error-color)',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BudgetPage