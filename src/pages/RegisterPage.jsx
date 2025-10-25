import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // 表单验证
    if (!username || !email || !password || !confirmPassword) {
      setError('请填写所有字段')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    // 模拟注册成功
    setError('')
    setSuccess('注册成功！请登录')
    
    // 清空表单
    setTimeout(() => {
      navigate('/login')
    }, 1500)
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
        
        {success && (
          <div style={{ color: 'var(--success-color)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              placeholder="请设置用户名"
              required
            />
          </div>
          
          <div className="mb-2">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="请输入邮箱地址"
              required
            />
          </div>
          
          <div className="mb-2">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
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
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError('')
              }}
              placeholder="请再次输入密码"
              required
            />
          </div>
          
          <button type="submit" className="primary-button">
            注册
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