import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function RegisterPage() {
  const [formData, setFormData] = useState({
    phone: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { register } = useAuth()
  
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
    
    // 表单验证
    if (!formData.phone || !formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('请填写所有必填字段')
      setLoading(false)
      return
    }
    
    // 手机号验证（简单的中国大陆手机号验证）
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(formData.phone)) {
      setError('请输入有效的手机号码')
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
    
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }
    
    if (formData.password.length < 6) {
      setError('密码长度至少为6位')
      setLoading(false)
      return
    }
    
    try {
      const result = await register(formData.phone, formData.username, formData.email, formData.password)
      
      if (result.success) {
        // 注册成功，跳转到登录页
        navigate('/login')
      } else {
        setError(result.error || '注册失败，请重试')
      }
    } catch (err) {
      setError('注册失败，请重试')
      console.error('Register error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="auth-form">
        <h2>注册新账号</h2>
        
        {error && (
          <div style={{ color: 'var(--error-color)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label htmlFor="phone">手机号 <span style={{color: 'var(--error-color)'}}>*</span></label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="请输入手机号码"
              required
            />
          </div>
          
          <div className="mb-2">
            <label htmlFor="username">用户名 <span style={{color: 'var(--error-color)'}}>*</span></label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="请设置用户名"
              required
            />
          </div>
          
          <div className="mb-2">
            <label htmlFor="email">邮箱 <span style={{color: 'var(--error-color)'}}>*</span></label>
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
          
          <div className="mb-2">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="请设置密码（至少6位）"
              minLength="6"
              required
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="请确认密码"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="primary-button"
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </button>
          
          <div className="mt-3 text-center">
            <p>已有账号？ <Link to="/login">立即登录</Link></p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage