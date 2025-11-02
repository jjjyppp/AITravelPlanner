import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useItinerary } from '../contexts/ItineraryContext'

function MyTripsPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()
  const { getUserItineraries, deleteItinerary } = useItinerary()
  const navigate = useNavigate()

  const loadTrips = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const result = await getUserItineraries()
      if (result.success) {
        setTrips(result.data)
      }
    } catch (error) {
      console.error('加载行程失败:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [user])

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm('确定要删除这个行程吗？')) {
      try {
        const result = await deleteItinerary(tripId)
        if (result.success) {
          setTrips(trips.filter(trip => trip.id !== tripId))
        } else {
          alert('删除失败：' + result.error)
        }
      } catch (error) {
        console.error('删除行程失败:', error)
        alert('删除失败，请重试')
      }
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadTrips()
  }

  const handleLogin = () => {
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="my-trips-page">
        <div className="loading-spinner">加载您的行程中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-required">
        <div className="card text-center">
          <h2>请先登录</h2>
          <p className="mb-3">登录后可以查看和管理您的行程</p>
          <button onClick={handleLogin}>前往登录</button>
        </div>
      </div>
    )
  }

  return (
    <div className="my-trips-page">
      <div className="page-header">
        <h2>我的行程</h2>
        <button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? '刷新中...' : '刷新'}
        </button>
      </div>
      
      {trips.length === 0 ? (
        <div className="card text-center">
          <p>您还没有保存任何行程</p>
          <Link to="/" className="mt-2">
            <button>开始规划新行程</button>
          </Link>
        </div>
      ) : (
        <div className="trips-list">
          {trips.map(trip => {
            const start = trip.start_date || trip.startDate || ''
            const end = trip.end_date || trip.endDate || ''
            const dateRange = (start && end)
              ? `${String(start)} 至 ${String(end)}`
              : '日期未指定'
            
            return (
              <div key={trip.id} className="card mb-3">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>{trip.title || `${trip.destination} ${trip.days || 1}日游`}</h3>
                    <div className="input-group" style={{ marginTop: '0.5rem' }}>
                      <div>
                        <strong>目的地:</strong> {trip.destination || '未指定'}
                      </div>
                      <div>
                        <strong>日期:</strong> {dateRange}
                      </div>
                      <div>
                        <strong>预算:</strong> {trip.budget || '未指定'}
                      </div>
                      <div>
                        <strong>人数:</strong> {trip.person_count || 1}人
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
            )
          })}
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
