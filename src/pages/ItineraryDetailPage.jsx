import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useItinerary } from '../contexts/ItineraryContext'
import { Container, Card, CardContent, Box, Typography, Paper, Divider, Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

function ItineraryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // 详情页不提供更新编辑功能
  
  const { user } = useAuth()
  const { getItineraryById } = useItinerary()

  useEffect(() => {
    // 如果有传递的行程数据，直接使用
    if (location.state && location.state.itinerary) {
      setItinerary(location.state.itinerary)
      setLoading(false)
      return
    }

    // 否则，从Supabase获取行程数据；若路由ID不是有效的整型，使用本地缓存回退
    const fetchItinerary = async () => {
      if (!user) {
        setError('请先登录查看行程详情')
        setLoading(false)
        return
      }
      
      try {
        // 如果路由参数是时间戳（如 Date.now()）且超出 int4 范围，直接回退本地展示
        const numId = Number(id)
        const INT4_MAX = 2147483647
        if (!Number.isFinite(numId) || numId > INT4_MAX) {
          const localContent = localStorage.getItem('currentItinerary') || ''
          const tripInfoRaw = localStorage.getItem('tripInfo')
          const tripInfo = tripInfoRaw ? JSON.parse(tripInfoRaw) : {}

          if (!localContent) {
            setError('行程不存在或尚未保存')
            setLoading(false)
            return
          }

          setItinerary({
            title: tripInfo.title || `${tripInfo.destination || '我的'}旅行计划`,
            destination: tripInfo.destination || '未指定',
            start_date: tripInfo.startDate || null,
            end_date: tripInfo.endDate || null,
            person_count: tripInfo.personCount || 1,
            budget: tripInfo.budget || null,
            interests: Array.isArray(tripInfo.interests) ? tripInfo.interests : [],
            content: localContent,
          })
          setLoading(false)
          return
        }

        const result = await getItineraryById(numId)
        if (result.success) {
          // 直接使用表数据；若存在结构化字段可在其上渲染
          setItinerary(result.data)
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

  // 不支持在线编辑，移除相关逻辑

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

  // 简单的 Markdown 转 HTML（与规划页一致的基本格式）
  const formatContent = (text) => {
    if (!text) return ''
    return text
      .replace(/^###\s+(.+)$/gm, '<h4>$1</h4>')
      .replace(/^##\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^#\s+(.+)$/gm, '<h2>$1</h2>')
      // 无序列表（- 开头）
      .replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li[^>]*>.*?<\/li>)+/gs, '<ul>$&</ul>')
      // 有序列表（更宽松：支持 1. / 1、 / 1． / 1) / 1） 且允许前导空格）
      .replace(/^\s*(?:\d+)[\.\u3002\uFF0E\u3001\)\uff09]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li[^>]*>.*?<\/li>)+/gs, function(match){
        if (match.includes('ol>')) return match; return '<ol>' + match + '</ol>'
      })
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(.*?)$/m, '<p>$1</p>')
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card elevation={0} sx={{ overflow: 'hidden', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ bgcolor: '#fafafa', p: 3, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              返回
            </Button>
            <Typography variant="h4" sx={{ flex: 1 }}>
              {itinerary.title}
            </Typography>
          </Box>

          <Box sx={{ p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" color="text.secondary">
                目的地：{itinerary.destination || '未指定'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                日期：{(itinerary.start_date || itinerary.startDate || '未指定')} 至 {(itinerary.end_date || itinerary.endDate || '未指定')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                人数：{itinerary.person_count || itinerary.personCount || 1} 人
              </Typography>
              {itinerary.budget && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                  预算：{itinerary.budget}
                </Typography>
              )}
              {Array.isArray(itinerary.interests) && itinerary.interests.length > 0 && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                  兴趣偏好：{itinerary.interests.join('、')}
                </Typography>
              )}
            </Box>

            <Divider sx={{ mb: 2 }}>
              <Typography variant="h6" color="text.secondary">行程内容</Typography>
            </Divider>

            {Array.isArray(itinerary?.days) && itinerary.days.length > 0 ? (
              <Paper elevation={3} sx={{ p: 3, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                {itinerary.days.map((day, idx) => (
                  <Box key={idx} sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#1565c0', mb: 1 }}>第 {day.day} 天</Typography>
                    {Array.isArray(day.activities) && day.activities.map((a, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.2 }}>
                        <Typography variant="body2" sx={{ minWidth: 72, color: 'text.secondary' }}>{a.time}</Typography>
                        <Typography variant="body1">{a.description}{a.location ? `（${a.location}）` : ''}</Typography>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Paper>
            ) : (
              <Paper elevation={3} sx={{ p: 3, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <div dangerouslySetInnerHTML={{ __html: formatContent(itinerary.content) }} />
              </Paper>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}

export default ItineraryDetailPage
