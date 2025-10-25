import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'

// 导入页面组件
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ItineraryDetailPage from './pages/ItineraryDetailPage'
import MyTripsPage from './pages/MyTripsPage'
import BudgetPage from './pages/BudgetPage'
import TravelPlanner from './components/TravelPlanner'
// 语音相关组件已移除

function App() {
  // 模拟用户登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  // 模拟登录功能
  const handleLogin = (userData) => {
    setUser(userData)
    setIsLoggedIn(true)
  }

  // 模拟登出功能
  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <Router>
      <div className="app">
        {/* 应用头部 */}
        <header className="app-header">
          <div className="header-container">
            <Link to="/" className="app-logo">
              <span>🧳 AI 旅行规划师</span>
            </Link>
            
            <nav className="app-nav">
              <Link to="/">首页</Link>
              <Link to="/travel-planner">旅行规划</Link>
              
              {isLoggedIn ? (
                // 已登录用户菜单
                <>
                  <Link to="/my-trips">我的行程</Link>
                  <Link to="/budget">预算管理</Link>
                  <button onClick={handleLogout} style={{ 
                    background: 'transparent', 
                    border: '1px solid white',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer'
                  }}>
                    登出
                  </button>
                </>
              ) : (
                // 未登录用户菜单
                <>
                  <Link to="/login">登录</Link>
                  <Link to="/register">注册</Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* 主内容区域 */}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/itinerary/:id" element={<ItineraryDetailPage />} />
            <Route path="/my-trips" element={<MyTripsPage isLoggedIn={isLoggedIn} />} />
            <Route path="/budget" element={<BudgetPage isLoggedIn={isLoggedIn} />} />
            <Route path="/travel-planner" element={<TravelPlanner />} />
            {/* 语音相关路由已移除 */}
          </Routes>
        </main>

        {/* 页脚 */}
        <footer className="app-footer">
          <div className="container">
            <p>© 2024 AI 旅行规划师 - 让旅行更智能、更便捷</p>
            <p className="mt-1">
              <Link to="/about">关于我们</Link> | 
              <Link to="/privacy">隐私政策</Link> | 
              <Link to="/terms">服务条款</Link>
            </p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
