import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardContent, Container, Divider, Paper, Snackbar, Alert, Typography, CircularProgress } from '@mui/material'
import LLMService from '../services/llmService'
import { useAuth } from '../contexts/AuthContext'
import { useItinerary } from '../contexts/ItineraryContext'
import MapSection from '../components/MapSection'

function AIItineraryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { saveItinerary } = useItinerary()

  // 从上一个页面接收的行程表单
  const form = location.state?.itineraryForm || location.state?.tripInfo

  const [isLoading, setIsLoading] = useState(true)
  const [progressResult, setProgressResult] = useState('')
  const [result, setResult] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  useEffect(() => {
    if (!form) {
      // 没有传入表单信息则返回首页
      navigate('/')
      return
    }

    const generate = async () => {
      try {
        setIsLoading(true)
        setResult('')
        setProgressResult('')

        // 构建用户旅行需求文本（与原有逻辑一致）
        const travelRequirements = `目的地: ${form.destination}, 开始日期: ${form.startDate}, 结束日期: ${form.endDate}, 人数: ${form.personCount}人, 兴趣偏好: ${form.interests}${form.budget ? `, 预算范围: ${form.budget}` : ''}`

        const prompt = `请帮我生成一份详细的旅行规划，我的旅行需求为：${travelRequirements}

请务必包含以下详细信息：
1. 详细的每日行程安排，具体到时间段
2. 景点信息：每个推荐景点的介绍、开放时间、门票价格、游览建议
3. 住宿推荐：具体酒店名称、位置、价格区间、特色和预订建议
4. 餐厅推荐：具体餐厅名称、特色菜品、人均消费、位置
5. 交通详情：
   - 抵达目的地的大交通建议（飞机/火车等）
   - 当地交通详细方案，包括具体线路、票价、运营时间
   - 景点间的最优交通方式
6. 费用估算：各项花费的明细预算
7. 实用小贴士：当地习俗、天气注意事项、必备物品等

输出要求：
- 使用结构化且清晰的排版，便于阅读。
- 在全文末尾追加一个仅包含路线点位的 JSON 代码块（使用\`\`\`json 包裹），结构严格如下：
\`\`\`json
{
  "route_points": [
    {"title": "名称", "lng": 116.3974, "lat": 39.9093, "day": 1, "time": "09:00", "address": "可选地址", "order": 1, "source": "ai", "location_text": "原始地点文本"}
  ]
}
\`\`\`
- 注意：经纬度为经度在前(lng), 纬度在后(lat)；数值范围 lng ∈ [-180,180], lat ∈ [-90,90]；若坐标不确定，可以省略该点，不要编造。
- 不要在 JSON 代码块外增加任何注释或解释性文字。
`

        const fullResult = await LLMService.generateStreamResponse(prompt, (chunk) => {
          setProgressResult(prev => prev + chunk)
        })

        setResult(fullResult)
      } catch (e) {
        alert('生成行程规划失败: ' + e.message)
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }

    generate()
  }, [form, navigate])

  const handleSave = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setSaving(true)
    try {
      const text = result || progressResult
      if (!text) {
        alert('暂无可保存的行程内容')
        return
      }

      // 从结果中提取标题
      const titleMatch = text.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : `${form.destination || '我的'}旅行计划`

      const normalizeDate = (d) => {
        if (!d) return null
        if (d === '未指定') return null
        return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
      }

      // 从结果中解析 route_points（如果模型按要求输出）
      const extractRoutePoints = (t) => {
        if (!t) return []
        const validPoint = (p) => p && Number.isFinite(Number(p.lng)) && Number.isFinite(Number(p.lat))
        const normalize = (arr) => Array.isArray(arr) ? arr.filter(validPoint) : []

        // 1) 优先：```json 代码块
        try {
          const codeBlock = t.match(/```json\s*([\s\S]*?)\s*```/i)
          if (codeBlock) {
            const parsed = JSON.parse(codeBlock[1])
            if (Array.isArray(parsed)) return normalize(parsed)
            if (parsed && Array.isArray(parsed.route_points)) return normalize(parsed.route_points)
          }
        } catch (_) {}

        // 2) 其次：直接查找 "route_points": [ ... ]
        try {
          const rpArrayMatch = t.match(/"route_points"\s*:\s*(\[[\s\S]*?\])/)
          if (rpArrayMatch) {
            const arr = JSON.parse(rpArrayMatch[1])
            return normalize(arr)
          }
        } catch (_) {}

        // 3) 兜底：查找第一个 JSON 对象，若包含 route_points 则用之
        try {
          const jsonObjMatch = t.match(/\{[\s\S]*\}/)
          if (jsonObjMatch) {
            const obj = JSON.parse(jsonObjMatch[0])
            if (obj && Array.isArray(obj.route_points)) return normalize(obj.route_points)
          }
        } catch (_) {}
        return []
      }

      const routePoints = extractRoutePoints(text)

      const payload = {
        title,
        destination: form.destination || '未指定',
        startDate: normalizeDate(form.startDate),
        endDate: normalizeDate(form.endDate),
        personCount: form.personCount ? Number(form.personCount) : 1,
        budget: form.budget && form.budget !== '未指定' ? form.budget : null,
        interests: Array.isArray(form.interests)
          ? form.interests
          : (typeof form.interests === 'string' && (form.interests.includes(',') || form.interests.includes('、')))
            ? form.interests.split(/,|、/).map(s => s.trim()).filter(Boolean)
            : (typeof form.interests === 'string' ? [form.interests] : []),
        content: text,
        route_points: routePoints,
      }

      const saveRes = await saveItinerary(payload)
      if (saveRes.success) {
        setShowSaveSuccess(true)
        // 保存成功后跳转到“我的行程”
        setTimeout(() => navigate('/my-trips'), 800)
      } else {
        alert('保存失败：' + saveRes.error)
      }
    } catch (e) {
      console.error('保存行程失败', e)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseSuccess = () => setShowSaveSuccess(false)

  const formatResult = (text) => {
    if (!text) return ''
    const stripRoutePointsBlock = (t) => t.replace(/```json[\s\S]*?```/gi, (m) => (m.includes('route_points') || m.includes('"route_points"')) ? '' : m)
    const cleaned = stripRoutePointsBlock(text)
    // 去除行首的数字编号（如 1. 2. 3. / 1、/ 1．/ 1) / 1））保持时间等中间数字不受影响
    const withoutLeadingNumbers = cleaned.replace(/^\s*\d+[\.\u3002\uFF0E\u3001\)\uff09]\s+/gm, '')
    return withoutLeadingNumbers
      .replace(/^###\s+(.+)$/gm, '<h4 style="margin-top: 1.5em; margin-bottom: 0.5em; color: #1976d2;">$1</h4>')
      .replace(/^##\s+(.+)$/gm, '<h3 style="margin-top: 2em; margin-bottom: 0.75em; color: #1976d2;">$1</h3>')
      .replace(/^#\s+(.+)$/gm, '<h2 style="margin-top: 2em; margin-bottom: 1em; color: #1565c0; border-bottom: 2px solid #e3f2fd; padding-bottom: 0.3em;">$1</h2>')
      .replace(/^\s*-\s+(.+)$/gm, '<li style="margin-bottom: 0.5em;">$1</li>')
      .replace(/(<li[^>]*>.*?<\/li>)+/gs, '<ul style="margin-top: 0.5em; margin-bottom: 1em; padding-left: 1.5em;">$&</ul>')
      .replace(/^\s*(?:\d+)[\.\u3002\uFF0E\u3001\)\uff09]\s+(.+)$/gm, '<li style="margin-bottom: 0.5em;">$1</li>')
      .replace(/(<li[^>]*>.*?<\/li>)+/gs, function(match){ if (match.includes('ol>')) return match; return '<ol style="margin-top: 0.5em; margin-bottom: 1em; padding-left: 1.5em;">' + match + '</ol>' })
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(.*?)$/m, '<p>$1</p>')
  }

  // 供地图预览使用：根据当前生成结果构建临时 itinerary
  const extractRoutePointsForPreview = (t) => {
    if (!t) return []
    const validPoint = (p) => p && Number.isFinite(Number(p.lng)) && Number.isFinite(Number(p.lat))
    const normalize = (arr) => Array.isArray(arr) ? arr.filter(validPoint) : []
    try {
      const codeBlock = t.match(/```json\s*([\s\S]*?)\s*```/i)
      if (codeBlock) {
        const parsed = JSON.parse(codeBlock[1])
        if (Array.isArray(parsed)) return normalize(parsed)
        if (parsed && Array.isArray(parsed.route_points)) return normalize(parsed.route_points)
      }
    } catch (_) {}
    try {
      const rpArrayMatch = t.match(/"route_points"\s*:\s*(\[[\s\S]*?\])/)
      if (rpArrayMatch) {
        const arr = JSON.parse(rpArrayMatch[1])
        return normalize(arr)
      }
    } catch (_) {}
    try {
      const jsonObjMatch = t.match(/\{[\s\S]*\}/)
      if (jsonObjMatch) {
        const obj = JSON.parse(jsonObjMatch[0])
        if (obj && Array.isArray(obj.route_points)) return normalize(obj.route_points)
      }
    } catch (_) {}
    return []
  }

  const textForMap = result || progressResult
  const previewRoutePoints = extractRoutePointsForPreview(textForMap)
  const previewItinerary = {
    destination: form?.destination,
    content: textForMap,
    route_points: previewRoutePoints,
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card elevation={0} sx={{ overflow: 'hidden', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ bgcolor: '#fafafa', p: 3, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h4" align="center" gutterBottom>
              AI 生成行程预览
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary">
              请确认下方计划，满意后点击“保存”写入行程
            </Typography>
          </Box>

          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSave}
                disabled={saving || isLoading}
                sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
              >
                {saving ? '保存中…' : '保存'}
              </Button>
              <Button variant="outlined" size="small" onClick={() => navigate(-1)}>返回</Button>
            </Box>

            {isLoading && !(result || progressResult) && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 6 }}>
                <CircularProgress color="primary" />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  正在生成行程规划…
                </Typography>
              </Box>
            )}

            {(result || progressResult) && (
              <Paper elevation={3} sx={{ p: 3, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Box sx={{ mb: 2 }}>
                  {previewRoutePoints.length > 0 ? (
                    <MapSection itinerary={previewItinerary} />
                  ) : (
                    <Box sx={{
                      height: 120,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary',
                      bgcolor: '#fafafa',
                      border: '1px dashed #e0e0e0',
                      borderRadius: 2
                    }}>
                      <CircularProgress size={20} sx={{ mr: 1.5 }} />
                      <Typography variant="body2">地图加载中（正在生成路线点位）…</Typography>
                    </Box>
                  )}
                </Box>
                <div
                  className="result-content"
                  dangerouslySetInnerHTML={{ __html: formatResult(isLoading ? progressResult : result) }}
                />
                {isLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress color="primary" />
                    <Typography variant="body2" sx={{ ml: 2, mt: 1 }}>
                      正在生成行程规划…
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={showSaveSuccess}
        autoHideDuration={2000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={handleCloseSuccess} sx={{ width: '100%' }}>
          ✓ 行程保存成功！
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default AIItineraryPage
