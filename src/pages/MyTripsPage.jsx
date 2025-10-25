import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function MyTripsPage({ isLoggedIn }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoggedIn) {
      // 模拟加载用户行程数据
      setTimeout(() => {
        const mockTrips = [
          {
            id: '1',
            destination: '日本东京',
            days: 5,
            budget: '10000元',
            createdAt: '2024-06-10',
            status: '计划中'
          },
          {
            id: '2',
            destination: '泰国曼谷',
            days: 4,
            budget: '8000元',
            createdAt: '2024-06-05',
            status: '已完成'
          },
          {
            id: '3',
            destination: '法国巴黎',
            days: 7,
            budget: '25000元',
            createdAt: '2024-05-20',
            status: '计划中'
          }
        ]
        setTrips(mockTrips)
        setLoading(false)
      }, 1000)
    } else {
      setLoading(false)
    }
  }, [isLoggedIn])

  // 处理删除行程
  const handleDeleteTrip = (tripId) => {
    if (window.confirm('确定要删除这个行程吗？')) {
      setTrips(trips.filter(trip => trip.id !== tripId))
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="auth-required">
        <div className="card text-center">
          <h2>请先登录</h2>
          <p className="mb-3">登录后可以查看和管理您的行程</p>
          <Link to="/login">
            <button>前往登录</button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading-spinner">加载您的行程中...</div>
  }

  return (
    <div className="my-trips-page">
      <h2>我的行程</h2>
      
      {trips.length === 0 ? (
        <div className="card text-center">
          <p>您还没有保存任何行程</p>
          <Link to="/" className="mt-2">
            <button>开始规划新行程</button>
          </Link>
        </div>
      ) : (
        <div className="trips-list">
          {trips.map(trip => (
            <div key={trip.id} className="card mb-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3>{trip.destination} {trip.days}日游</h3>
                  <div className="input-group" style={{ marginTop: '0.5rem' }}>
                    <div>
                      <strong>预算:</strong> {trip.budget}
                    </div>
                    <div>
                      <strong>创建日期:</strong> {trip.createdAt}
                    </div>
                    <div>
                      <strong>状态:</strong> 
                      <span style={{
                        marginLeft: '0.5rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: trip.status === '计划中' ? 'var(--warning-color)' : 'var(--success-color)',
                        color: 'white',
                        fontSize: '0.8rem'
                      }}>
                        {trip.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/itinerary/${trip.id}`}>
                    <button>查看</button>
                  </Link>
                  <button 
                    onClick={() => handleDeleteTrip(trip.id)}
                    style={{ backgroundColor: 'var(--error-color)' }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-3 text-center">
        <Link to="/">
          <button>规划新行程</button>
        </Link>
      </div>
    </div>
  )
}

export default MyTripsPage