import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useItinerary } from '../contexts/ItineraryContext'

function ItineraryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false)
  
  const { user } = useAuth()
  const { getItineraryById, updateItinerary } = useItinerary()

  useEffect(() => {
    // 如果有传递的行程数据，直接使用
    if (location.state && location.state.itinerary) {
      setItinerary(location.state.itinerary)
      setLoading(false)
      return
    }

    // 否则，从Supabase获取行程数据
    const fetchItinerary = async () => {
      if (!user) {
        setError('请先登录查看行程详情')
        setLoading(false)
        return
      }
      
      try {
        const result = await getItineraryById(id)
        if (result.success) {
          // 如果行程数据中包含itinerary_data字段，则使用该字段的数据
          const itineraryData = result.data.itinerary_data || result.data
          setItinerary(itineraryData)
        } else {
          setError(result.error || '获取行程详情失败')
        }
      } catch (err) {
        setError('获取行程详情失败')
        console.error('Error fetching itinerary:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchItinerary()
  }, [id, location.state, user, getItineraryById])

  const handleBack = () => {
    navigate(-1)
  }

  const handleBackToHome = () => {
    navigate('/')
  }

  const handleUpdateItinerary = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    
    setUpdating(true)
    try {
      const updateData = {
        title: itinerary.title,
        itinerary_data: itinerary
      }
      
      const result = await updateItinerary(id, updateData)
      if (result.success) {
        setShowUpdateSuccess(true)
        setTimeout(() => setShowUpdateSuccess(false), 3000)
      } else {
        alert('更新失败：' + result.error)
      }
    } catch (error) {
      console.error('更新行程失败:', error)
      alert('更新失败，请重试')
    } finally {
      setUpdating(false)
    }
  }

  const handleEditActivity = (dayIndex, activityIndex, field, value) => {
    const updatedItinerary = { ...itinerary }
    updatedItinerary.days[dayIndex].activities[activityIndex][field] = value
    setItinerary(updatedItinerary)
  }

  if (loading) {
    return (
      <div className="itinerary-detail-page">
        <div className="loading">加载行程详情中...</div>
      </div>
    )
  }

  if (error || !itinerary) {
    return (
      <div className="itinerary-detail-page">
        <div className="error">
          <h2>{error || '行程不存在'}</h2>
          <button onClick={handleBackToHome}>返回首页</button>
        </div>
      </div>
    )
  }

  return (
    <div className="itinerary-detail-page">
      <header className="itinerary-header">
        <button onClick={handleBack} className="back-button">← 返回</button>
        <h1>{itinerary.title}</h1>
        {user && (
          <button onClick={handleUpdateItinerary} disabled={updating} className="update-button">
            {updating ? '更新中...' : '保存更新'}
          </button>
        )}
      </header>

      {showUpdateSuccess && (
        <div className="update-success-message">
          ✓ 行程更新成功！
        </div>
      )}

      <div className="itinerary-info">
        <div className="info-item">
          <span className="info-label">目的地：</span>
          <span className="info-value">{itinerary.destination}</span>
        </div>
        <div className="info-item">
          <span className="info-label">日期：</span>
          <span className="info-value">{itinerary.start_date || itinerary.startDate} 至 {itinerary.end_date || itinerary.endDate}</span>
        </div>
        <div className="info-item">
          <span className="info-label">人数：</span>
          <span className="info-value">{itinerary.person_count || itinerary.personCount || 1} 人</span>
        </div>
        <div className="info-item">
          <span className="info-label">预算：</span>
          <span className="info-value">{itinerary.budget}</span>
        </div>
        {itinerary.interests && itinerary.interests.length > 0 && (
          <div className="info-item">
            <span className="info-label">兴趣偏好：</span>
            <span className="info-value">{itinerary.interests.join('、')}</span>
          </div>
        )}
      </div>

      <div className="itinerary-content">
        <section className="daily-itinerary">
          <h2>每日行程</h2>
          {itinerary.days.map((day, dayIndex) => (
            <div key={dayIndex} className="day-section">
              <h3>第 {day.day} 天</h3>
              <div className="activities">
                {day.activities.map((activity, actIndex) => (
                  <div key={actIndex} className="activity-item">
                    <span className="activity-time">{activity.time}</span>
                    <div className="activity-details">
                      <input
                        type="text"
                        value={activity.description}
                        onChange={(e) => handleEditActivity(dayIndex, actIndex, 'description', e.target.value)}
                        className="activity-description-input"
                      />
                      {activity.location && (
                        <input
                          type="text"
                          value={activity.location}
                          onChange={(e) => handleEditActivity(dayIndex, actIndex, 'location', e.target.value)}
                          className="activity-location-input"
                          placeholder="地点"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {itinerary.tips && itinerary.tips.length > 0 && (
          <section className="travel-tips">
            <h2>旅行提示</h2>
            <ul>
              {itinerary.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

export default ItineraryDetailPage