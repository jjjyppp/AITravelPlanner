import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useItinerary } from '../contexts/ItineraryContext'
import { Container, Card, CardContent, Box, Typography, Paper, Divider, Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PlaceIcon from '@mui/icons-material/Place'
import MapSection from '../components/MapSection'

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
    // 展示时移除 route_points 的 JSON 代码块
    const stripRoutePointsBlock = (t) => t.replace(/```json[\s\S]*?```/gi, (m) => (m.includes('route_points') || m.includes('"route_points"')) ? '' : m)
    const cleaned = stripRoutePointsBlock(text)
    // 若末尾存在包含 route_points 的 JSON 对象，整体移除
    let cleaned2 = cleaned
    try {
      const idx = cleaned.lastIndexOf('"route_points"')
      if (idx !== -1) {
        const braceIdx = cleaned.lastIndexOf('{', idx)
        if (braceIdx !== -1) cleaned2 = cleaned.slice(0, braceIdx)
      }
    } catch {}
    // 去除行首的数字编号（如 1. 2. 3. / 1、/ 1．/ 1) / 1））保持时间等中间数字不受影响
    const withoutLeadingNumbers = cleaned2.replace(/^\s*\d+[\.\u3002\uFF0E\u3001\)\uff09]\s+/gm, '')
    return withoutLeadingNumbers
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

  // 基于 route_points 构建“每日活动”结构，便于以卡片样式展示
  const buildDaysFromRoutePoints = (rp) => {
    if (!Array.isArray(rp) || rp.length === 0) return []
    const groups = new Map()
    rp.forEach((p, idx) => {
      const d = Number(p.day) > 0 ? Number(p.day) : 1
      if (!groups.has(d)) groups.set(d, [])
      const title = p.title || p.name || p.label || p.address || p.location_text || `第${idx + 1}站`
      groups.get(d).push({
        order: Number.isFinite(Number(p.order)) ? Number(p.order) : idx + 1,
        time: typeof p.time === 'string' ? p.time : '',
        description: title,
        location: p.address || p.location_text || ''
      })
    })
    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, items]) => ({ day, title: `第 ${day} 天`, activities: items.sort((a, b) => a.order - b.order) }))
  }

  const displayDays = (Array.isArray(itinerary?.route_points) && itinerary.route_points.length)
    ? buildDaysFromRoutePoints(itinerary.route_points)
    : (Array.isArray(itinerary?.days) ? itinerary.days : [])

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

            {/* 地图概览：从行程中提取位置点，自动绘制路线 */}
            <Box sx={{ mb: 3 }}>
              <MapSection itinerary={itinerary} />
            </Box>

            <Divider sx={{ mb: 2 }}>
              <Typography variant="h6" color="text.secondary">行程内容</Typography>
            </Divider>

            {Array.isArray(displayDays) && displayDays.length > 0 ? (
              <Paper elevation={3} sx={{ p: 3, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                {displayDays.map((day, idx) => (
                  <Box key={idx} className="itinerary-day-card" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#0f172a', mb: 1.5, fontWeight: 700 }}>{day.title || `第 ${day.day} 天`}</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box className="activity-list">
                      {(Array.isArray(day.activities) ? day.activities : []).map((a, i) => {
                        const clean = (t) => (t || '').replace(/（.*?）/g, '').trim()
                        const desc = clean(a.description)
                        const isMeal = /早\s*餐|午\s*餐|晚\s*餐|美食|餐厅|用餐/i.test(desc)
                        const isStay = /酒店|民宿|入住|check[-\s]*in/i.test(desc)
                        const isTraffic = /地铁|巴士|公交|火车|高铁|航班|出发|抵达|车站|机场|换乘/i.test(desc)
                        const tag = isMeal ? '用餐' : (isStay ? '住宿' : (isTraffic ? '交通' : '游览'))
                        const chipClass = isMeal ? 'chip-food' : (isStay ? 'chip-stay' : (isTraffic ? 'chip-traffic' : 'chip-visit'))
                        return (
                          <Box key={i} className="activity-item">
                            <Box className="activity-badge">{i + 1}</Box>
                            <Box className="activity-time"><AccessTimeIcon fontSize="small" /><span>{a.time || '全天'}</span></Box>
                            <Box className="activity-content">
                              <Box className="activity-title-row">
                                <Typography className="activity-title">{desc}</Typography>
                                <span className={`activity-chip ${chipClass}`}>{tag}</span>
                              </Box>
                              {a.location && (
                                <Box className="activity-loc"><PlaceIcon fontSize="small" /><span>{a.location}</span></Box>
                              )}
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
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
