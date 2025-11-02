import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import SpeechRecognition from '../components/SpeechRecognition'
import { useItinerary } from '../contexts/ItineraryContext'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'
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

function ExpensePage() {
  const { user } = useAuth()
  const { getUserItineraries } = useItinerary()

  const [itineraries, setItineraries] = useState([])
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [newExpense, setNewExpense] = useState({
    category: '餐饮',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    tripId: '',
    notes: ''
  })
  // 编辑状态
  const [editingId, setEditingId] = useState(null)
  const [editingExpense, setEditingExpense] = useState({ category: '餐饮', amount: '', date: '', notes: '' })
  const [activeTrip, setActiveTrip] = useState('')
  const [currentSpeechText, setCurrentSpeechText] = useState('')

  // 加载用户行程
  useEffect(() => {
    const loadTrips = async () => {
      if (!user) { setLoadingTrips(false); return }
      try {
        const result = await getUserItineraries()
        if (result.success) {
          setItineraries(result.data)
          if (result.data.length > 0) {
            const firstId = String(result.data[0].id)
            setActiveTrip(firstId)
            setNewExpense(prev => ({ ...prev, tripId: firstId }))
          }
        }
      } finally {
        setLoadingTrips(false)
      }
    }
    loadTrips()
  }, [user, getUserItineraries])

  // 根据选中行程加载开销
  const loadExpenses = async (tripId) => {
    if (!user || !tripId) return
    setLoadingExpenses(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('itinerary_id', Number(tripId))
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setExpenses(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('加载开销失败:', e)
      setExpenses([])
    } finally {
      setLoadingExpenses(false)
    }
  }

  useEffect(() => {
    if (activeTrip) loadExpenses(activeTrip)
  }, [activeTrip])

  // 支出类别选项
  const categories = ['餐饮', '交通', '住宿', '门票', '购物', '其他']

  // 处理语音识别结果
  const handleSpeechResult = (text, isReplace = false) => {
    // 更新当前识别结果显示
    setCurrentSpeechText(text)
    
    // 解析语音输入
    parseExpenseVoiceInput(text)
  }

  // 处理语音识别错误
  const handleSpeechError = (error) => {
    console.error('语音识别错误:', error)
    alert('语音识别出错: ' + (error.message || '未知错误'))
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
  const addExpense = async (e) => {
    e.preventDefault()
    if (!activeTrip) {
      alert('请先选择一个行程')
      return
    }
    const amountNum = parseFloat(newExpense.amount)
    if (!newExpense.amount || isNaN(amountNum) || amountNum <= 0) {
      alert('请输入有效金额')
      return
    }

    try {
      const payload = {
        user_id: user.id,
        itinerary_id: Number(activeTrip),
        category: newExpense.category,
        amount: amountNum,
        date: newExpense.date,
        notes: newExpense.notes || null,
      }
      const { data, error } = await supabase
        .from('expenses')
        .insert([payload])
        .select()
      if (error) throw error
      // 刷新列表
      setExpenses([...(data || []), ...expenses])
      // 重置表单
      setNewExpense({
        category: '餐饮',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        tripId: activeTrip,
        notes: ''
      })
    } catch (err) {
      console.error('添加开销失败:', err)
      alert('添加开销失败，请检查网络或权限设置')
    }
  }

  // 删除支出
  const deleteExpense = async (id) => {
    if (!window.confirm('确定要删除该开销记录吗？')) return
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      setExpenses(expenses.filter(expense => expense.id !== id))
    } catch (err) {
      console.error('删除开销失败:', err)
      alert('删除失败，请重试')
    }
  }

  // 进入编辑
  const startEdit = (expense) => {
    setEditingId(expense.id)
    setEditingExpense({
      category: expense.category,
      amount: String(expense.amount),
      date: String(expense.date),
      notes: expense.notes || ''
    })
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditingExpense({ category: '餐饮', amount: '', date: '', notes: '' })
  }

  // 保存编辑
  const saveEdit = async () => {
    if (!editingId) return
    const amountNum = parseFloat(editingExpense.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('请输入有效金额')
      return
    }
    try {
      const payload = {
        category: editingExpense.category,
        amount: amountNum,
        date: editingExpense.date,
        notes: editingExpense.notes || null
      }
      const { data, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', editingId)
        .eq('user_id', user.id)
        .select()
      if (error) throw error
      // 更新本地列表
      const updated = (data && data[0]) || null
      if (updated) {
        setExpenses(prev => prev.map(e => e.id === editingId ? { ...e, ...updated } : e))
      }
      cancelEdit()
    } catch (err) {
      console.error('更新开销失败:', err)
      alert('更新失败，请重试')
    }
  }

  // 过滤当前行程的支出
  const filteredExpenses = useMemo(() => expenses, [expenses])

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

  if (!user) {
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

  if (loadingTrips) {
    return (
      <div className="my-trips-page">
        <div className="loading-spinner">加载行程列表中...</div>
      </div>
    )
  }

  if (itineraries.length === 0) {
    return (
      <div className="auth-required">
        <div className="card text-center">
          <h2>尚未创建行程</h2>
          <p className="mb-3">请先创建并保存一个行程后再记录开销</p>
          <Link to="/">
            <button>去创建行程</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="budget-page">
      <h2>旅行开销</h2>
      
      {/* 行程选择器 */}
      <div className="card mb-3">
        <label htmlFor="tripSelect">选择行程</label>
        <select
          id="tripSelect"
          value={activeTrip}
          onChange={(e) => {
            setActiveTrip(e.target.value)
            setNewExpense(prev => ({ ...prev, tripId: e.target.value }))
          }}
        >
          {itineraries.map(trip => {
            const start = trip.start_date || trip.startDate || ''
            const end = trip.end_date || trip.endDate || ''
            const label = trip.title || `${trip.destination || ''}`
            const dates = start && end ? `（${start} 至 ${end}）` : ''
            return (
              <option key={trip.id} value={trip.id}>{label} {dates}</option>
            )
          })}
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <button type="submit">添加支出</button>
            <div style={{ flex: 1 }}>
              <SpeechRecognition
                onResult={handleSpeechResult}
                onError={handleSpeechError}
                placeholder="语音记录支出信息，如：餐饮 50元"
              />
              
              {/* 实时识别结果显示
              {currentSpeechText && (
                <div className="speech-realtime-result">
                  <div className="result-label">🎙️ 实时识别：</div>
                  <div className="result-text">{currentSpeechText}</div>
                </div>
              )} */}
            </div>
          </div>
        </form>
      </div>

      {/* 支出统计和图表 */}
      <div className="card mb-3">
        <h3>支出统计</h3>
        {loadingExpenses ? (
          <p>开销加载中...</p>
        ) : (
          <>
            <p>总支出: <strong style={{ color: 'var(--primary-color)' }}>{totalExpense.toFixed(2)} 元</strong></p>
            <div className="budget-chart">
              {expensesByCategory.length > 0 ? renderExpenseChart() : <p>暂无支出数据</p>}
            </div>
          </>
        )}
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
                {editingId === expense.id ? (
                  <>
                    <div>
                      <select
                        value={editingExpense.category}
                        onChange={(e) => setEditingExpense(prev => ({ ...prev, category: e.target.value }))}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingExpense.amount}
                        onChange={(e) => setEditingExpense(prev => ({ ...prev, amount: e.target.value }))}
                      /> 元
                    </div>
                    <div>
                      <input
                        type="date"
                        value={editingExpense.date}
                        onChange={(e) => setEditingExpense(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editingExpense.notes}
                        onChange={(e) => setEditingExpense(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="备注"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={saveEdit} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>保存</button>
                      <button onClick={cancelEdit} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>取消</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{expense.category}</div>
                    <div>{Number(expense.amount).toFixed(2)} 元</div>
                    <div>{String(expense.date)}</div>
                    <div>{expense.notes || '-'}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => startEdit(expense)}
                        style={{ 
                          backgroundColor: 'var(--primary-color)',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        编辑
                      </button>
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
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpensePage
