import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // 简单的表单验证
    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }

    // 模拟登录验证
    if (username === 'demo' && password === '123456') {
      // 登录成功，调用父组件传递的onLogin函数
      onLogin({ username: username, id: '1' })
      navigate('/')
    } else {
      setError('用户名或密码错误')
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
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              placeholder="请输入用户名"
              required
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="请输入密码"
              required
            />
          </div>
          
          <button type="submit" className="primary-button">
            登录
          </button>
          
          <div className="mt-3 text-center">
            <p>还没有账号？ <Link to="/register">立即注册</Link></p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              提示：可以使用 demo/123456 进行测试
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage