import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { ItineraryProvider } from './contexts/ItineraryContext'
import { useAuth } from './contexts/AuthContext'

// 导入页面组件
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ItineraryDetailPage from './pages/ItineraryDetailPage'
import MyTripsPage from './pages/MyTripsPage'
import ExpensePage from './pages/ExpensePage'
import AIItineraryPage from './pages/AIItineraryPage'
// 语音相关组件已移除

function InnerApp() {
  const { user, logout } = useAuth()
  const username = user?.user_metadata?.username || user?.email

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
              
              <Link to="/my-trips">我的行程</Link>
              {user ? (
                <>
                  <Link to="/expense">旅行开销</Link>
                  <span style={{ color: 'white', marginLeft: '0.5rem' }}>你好，{username}</span>
                  <button onClick={logout} style={{ 
                    background: 'transparent', 
                    border: '1px solid white',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    marginLeft: '0.5rem'
                  }}>
                    登出
                  </button>
                </>
              ) : (
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/itinerary/:id" element={<ItineraryDetailPage />} />
            <Route path="/my-trips" element={<MyTripsPage />} />
            <Route path="/expense" element={<ExpensePage />} />
            <Route path="/ai-itinerary" element={<AIItineraryPage />} />
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

function App() {
  return (
    <AuthProvider>
      <ItineraryProvider>
        <InnerApp />
      </ItineraryProvider>
    </AuthProvider>
  )
}

export default App
