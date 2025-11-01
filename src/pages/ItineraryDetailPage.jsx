import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function ItineraryDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [itineraryContent, setItineraryContent] = useState('')
  const [travelInfo, setTravelInfo] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // 从localStorage获取大模型生成的行程内容
  useEffect(() => {
    try {
      // 获取存储的行程内容
      const content = localStorage.getItem('currentItinerary')
      const info = localStorage.getItem('tripInfo')
      
      if (content && info) {
        setItineraryContent(content)
        const parsedInfo = JSON.parse(info)
        setTravelInfo(parsedInfo)
      } else {
        setError('未找到行程信息，请先生成行程')
      }
    } catch (err) {
      console.error('获取行程信息失败:', err)
      setError('加载行程失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  // 处理保存行程
  const handleSaveItinerary = () => {
    // 模拟保存操作
    alert('行程已保存到您的账户！')
  }

  if (loading) {
      return <div className="loading-spinner">加载行程中...</div>
    }

    if (error) {
      return (
        <div className="error-container">
          <h3>{error}</h3>
          <button onClick={() => navigate('/')}>返回首页</button>
        </div>
      )
    }

    return (
      <div className="itinerary-detail-page">
        <div className="card mb-3">
          <h2>{travelInfo?.destination || '旅行行程'} 行程</h2>
          <div className="input-group">
            {travelInfo && (
              <>
                <div>
                  <strong>预算:</strong> {travelInfo.budget}
                </div>
                <div>
                  <strong>人数:</strong> {travelInfo.personCount || 1}人
                </div>
                <div>
                  <strong>开始日期:</strong> {travelInfo.startDate}
                </div>
                <div>
                  <strong>结束日期:</strong> {travelInfo.endDate}
                </div>
                <div>
                  <strong>兴趣偏好:</strong> {travelInfo.interests?.join('、') || '无'}
                </div>
                <div>
                  <strong>创建日期:</strong> {new Date().toLocaleDateString()}
                </div>
              </>
            )}
          </div>
          <button className="mt-2" onClick={handleSaveItinerary}>保存行程</button>
        </div>

        {/* 大模型生成的行程内容 */}
        <div className="card">
          <div className="llm-content">
            <h3>行程详细规划</h3>
            <div 
              className="markdown-content"
              dangerouslySetInnerHTML={{
                __html: itineraryContent
                  .replace(/\n/g, '<br>')
                  .replace(/### (.+?)/g, '<h3>$1</h3>')
                  .replace(/## (.+?)/g, '<h2>$1</h2>')
                  .replace(/(?<!\|)\*\*([^*]+?)\*\*(?!\|)/g, '<strong>$1</strong>')
                  .replace(/(?<!\|)\*([^*]+?)\*(?!\|)/g, '<em>$1</em>')
                  .replace(/^\- (.+?)$/gm, '<li>$1</li>')
                  .replace(/(<li>.+?<\/li>)(?!\s*<li>)/gs, '<ul>$&</ul>')
              }}
            />
          </div>
        </div>
      </div>
  )
}

export default ItineraryDetailPage