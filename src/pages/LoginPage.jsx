import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // 简单的表单验证
    if (!formData.email || !formData.password) {
      setError('请输入邮箱和密码')
      setLoading(false)
      return
    }
    
    // 邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('请输入有效的邮箱地址')
      setLoading(false)
      return
    }

    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        // 登录成功，跳转首页
        navigate('/')
      } else {
        setError(result.error || '登录失败，请重试')
      }
    } catch (err) {
      setError('登录失败，请重试')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="auth-form">
        <h2>登录</h2>
        
        {error && (
          <div style={{ color: 'var(--error-color)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="请输入邮箱地址"
              required
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="请输入密码"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="primary-button"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
          
          <div className="mt-3 text-center">
            <p>还没有账号？ <Link to="/register">立即注册</Link></p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              提示：请使用注册的邮箱和密码登录
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage