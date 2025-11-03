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

输出要求（严格遵守）：
- 使用结构化且清晰的排版，便于阅读。
- 必须在全文末尾追加一个“仅包含路线点位”的 JSON 代码块（使用\`\`\`json 包裹），且必须包含键名 route_points：
\`\`\`json
{
  "route_points": [
    {"title": "名称", "lng": 116.3974, "lat": 39.9093, "day": 1, "time": "09:00-10:30", "order": 1, "detail": "1-2 句具体游览/活动建议"}
  ]
}
\`\`\`
- 严格要求：
  - 必须包含 "route_points" 字段（即使数组为空也必须输出，如 "route_points": []）。
  - route_points 为数组，元素为对象；每个对象至少包含：title(字符串)、lng(数字)、lat(数字)、day(数字)、time(字符串，24 小时制区间，如 "HH:MM-HH:MM")。可选：order(数字)、detail(字符串 1-2 句具体行程说明)、start_time/end_time(字符串)。
  - lng/lat 必须是数值，lng 在前，lat 在后；取值范围：lng∈[-180,180]，lat∈[-90,90]。
  - 按行程发生顺序排列，尽量保证不少于 2 个点；若无法提供坐标，可返回空数组，但字段必须存在。
  - time 不允许写“全天/All day”等模糊表述，务必给出区间；若提供了 start_time/end_time，也请填充组合后的 time。
  - 除了上述 JSON 代码块，不要输出任何额外注释或解释。
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
        const parsePair = (s) => {
          if (typeof s !== 'string') return null
          const m = s.split(',').map(v => Number(String(v).trim()))
          if (m.length === 2 && m.every(Number.isFinite)) return { lng: m[0], lat: m[1] }
          return null
        }
        const coercePoints = (arr) => {
          const out = []
          if (!Array.isArray(arr)) return out
          for (const p of arr) {
            if (!p) continue
            let lng, lat, title, time, detail
            if (Array.isArray(p) && p.length >= 2) {
              lng = Number(p[0]); lat = Number(p[1])
              title = p.title || p[2]
            } else if (typeof p === 'string') {
              const pair = parsePair(p); if (pair) { lng = pair.lng; lat = pair.lat }
            } else if (typeof p === 'object') {
              title = p.title || p.name || p.label
              const pos = Array.isArray(p.position) ? p.position : (Array.isArray(p.coord) ? p.coord : null)
              lng = Number(p.lng ?? p.lon ?? p.longitude ?? (pos ? pos[0] : undefined))
              lat = Number(p.lat ?? p.latitude ?? (pos ? pos[1] : undefined))
              if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
                const pair = parsePair(p.location || p.location_text || '')
                if (pair) { lng = pair.lng; lat = pair.lat }
              }
              // 提取时间与详情
              const start = (typeof p.start_time === 'string' && p.start_time) || ''
              const end = (typeof p.end_time === 'string' && p.end_time) || ''
              const joinTime = (s, e) => (s && e ? `${s}-${e}` : (typeof p.time === 'string' ? p.time : ''))
              time = joinTime(start, end)
              detail = (typeof p.detail === 'string' && p.detail) || (typeof p.notes === 'string' && p.notes) || (typeof p.description === 'string' && p.description) || ''
            }
            if (Number.isFinite(lng) && Number.isFinite(lat)) out.push({ lng, lat, title, time, detail, order: Number(p.order), day: Number(p.day) })
          }
          return out
        }

        // 1) 优先：```json 代码块
        try {
          const codeBlock = t.match(/```json\s*([\s\S]*?)\s*```/i)
          if (codeBlock) {
            const parsed = JSON.parse(codeBlock[1])
            if (Array.isArray(parsed)) return coercePoints(parsed)
            if (parsed && Array.isArray(parsed.route_points)) return coercePoints(parsed.route_points)
          }
        } catch (_) {}

        // 2) 其次：直接查找 "route_points": [ ... ]
        try {
          const rpArrayMatch = t.match(/"route_points"\s*:\s*(\[[\s\S]*?\])/)
          if (rpArrayMatch) {
            const arr = JSON.parse(rpArrayMatch[1])
            return coercePoints(arr)
          }
        } catch (_) {}

        // 3) 兜底：查找第一个 JSON 对象，若包含 route_points 则用之
        try {
          const jsonObjMatch = t.match(/\{[\s\S]*\}/)
          if (jsonObjMatch) {
            const obj = JSON.parse(jsonObjMatch[0])
            if (obj && Array.isArray(obj.route_points)) return coercePoints(obj.route_points)
          }
        } catch (_) {}
        return []
      }

      let routePoints = extractRoutePoints(text)
      // 确保每个点都有 day（若缺失，则根据正文粗略分配或默认 1）
      const ensureDay = (pts, t) => {
        if (!Array.isArray(pts)) return []
        let lastDay = 1
        const hasAnyDay = pts.some(p => Number.isFinite(Number(p.day)) && Number(p.day) > 0)
        if (hasAnyDay) {
          return pts.map(p => {
            const d = Number(p.day)
            if (Number.isFinite(d) && d > 0) { lastDay = d; return { ...p, day: d } }
            return { ...p, day: lastDay }
          })
        }
        // 从正文推断天数总量（DayX 或 第X天）
        let numDays = 0
        try {
          const m1 = t.match(/Day\s*(\d{1,2})/gi) || []
          const m2 = t.match(/第\s*(\d{1,2})\s*天/g) || []
          numDays = Math.max(m1.length, m2.length)
          if (!numDays && (m1.length || m2.length)) {
            const nums = []
            m1.forEach(s => { const n = parseInt((s.match(/\d+/)||[])[0]); if (n) nums.push(n) })
            m2.forEach(s => { const n = parseInt((s.match(/\d+/)||[])[0]); if (n) nums.push(n) })
            if (nums.length) numDays = Math.max(...nums)
          }
        } catch {}
        if (!numDays || numDays < 1) numDays = 1
        const block = Math.max(1, Math.ceil(pts.length / numDays))
        return pts.map((p, i) => ({ ...p, day: Math.floor(i / block) + 1 }))
      }
      // 兜底：若模型未给出 route_points，尝试从正文中提取 "lng, lat" 对并构造简易点位
      if (!Array.isArray(routePoints) || routePoints.length === 0) {
        const coords = []
        const regex = /(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/g
        let m
        while ((m = regex.exec(text))) {
          const lng = Number(m[1]); const lat = Number(m[2])
          if (Number.isFinite(lng) && Number.isFinite(lat)) coords.push([lng, lat])
        }
        if (coords.length) {
          routePoints = coords.map((p, idx) => ({ title: `第${idx + 1}站`, lng: p[0], lat: p[1], order: idx + 1 }))
        } else {
          routePoints = []
        }
      }
      routePoints = ensureDay(routePoints, text)

      // 若仍缺少 time 字段，按照简单规则补齐（避免显示“全天”）：
      const fillMissingTimes = (pts) => {
        const byDay = new Map()
        pts.forEach(p => {
          const d = Number(p.day) > 0 ? Number(p.day) : 1
          if (!byDay.has(d)) byDay.set(d, [])
          byDay.get(d).push(p)
        })
        const pad = (n) => String(n).padStart(2, '0')
        byDay.forEach(list => {
          list.sort((a,b) => (Number(a.order)||0) - (Number(b.order)||0))
          const startHour = 9
          const slot = Math.max(60, Math.floor(720 / Math.max(1, list.length))) // 12 小时窗口，至少 60 分钟
          list.forEach((p, idx) => {
            if (typeof p.time === 'string' && p.time.includes(':')) return
            const sh = startHour + Math.floor((slot * idx) / 60)
            const sm = (slot * idx) % 60
            const eh = startHour + Math.floor((slot * (idx + 1)) / 60)
            const em = (slot * (idx + 1)) % 60
            p.time = `${pad(sh)}:${pad(sm)}-${pad(eh)}:${pad(em)}`
          })
        })
        return pts
      }

      routePoints = fillMissingTimes(routePoints)

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
    // 若有未加围栏的 JSON 对象且包含 "route_points"，从该对象起截断
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
    const parsePair = (s) => {
      if (typeof s !== 'string') return null
      const m = s.split(',').map(v => Number(String(v).trim()))
      if (m.length === 2 && m.every(Number.isFinite)) return { lng: m[0], lat: m[1] }
      return null
    }
    const coerce = (arr) => {
      const out = []
      if (!Array.isArray(arr)) return out
      for (const p of arr) {
        if (!p) continue
        let lng, lat, title, order, day
        if (Array.isArray(p) && p.length >= 2) {
          lng = Number(p[0]); lat = Number(p[1])
          title = p[2]
        } else if (typeof p === 'string') {
          const pair = parsePair(p); if (pair) { lng = pair.lng; lat = pair.lat }
        } else if (typeof p === 'object') {
          title = p.title || p.name || p.label || p.address || p.location_text
          order = Number(p.order)
          day = Number(p.day)
          const pos = Array.isArray(p.position) ? p.position : (Array.isArray(p.coord) ? p.coord : null)
          lng = Number(p.lng ?? p.lon ?? p.longitude ?? (pos ? pos[0] : undefined))
          lat = Number(p.lat ?? p.latitude ?? (pos ? pos[1] : undefined))
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            const pair = parsePair(p.location || p.location_text || '')
            if (pair) { lng = pair.lng; lat = pair.lat }
          }
        }
        if (Number.isFinite(lng) && Number.isFinite(lat)) out.push({ lng, lat, title, order, day })
      }
      return out
    }
    try {
      const codeBlock = t.match(/```json\s*([\s\S]*?)\s*```/i)
      if (codeBlock) {
        const parsed = JSON.parse(codeBlock[1])
        if (Array.isArray(parsed)) return coerce(parsed)
        if (parsed && Array.isArray(parsed.route_points)) return coerce(parsed.route_points)
      }
    } catch (_) {}
    try {
      const rpArrayMatch = t.match(/"route_points"\s*:\s*(\[[\s\S]*?\])/)
      if (rpArrayMatch) {
        const arr = JSON.parse(rpArrayMatch[1])
        return coerce(arr)
      }
    } catch (_) {}
    try {
      const jsonObjMatch = t.match(/\{[\s\S]*\}/)
      if (jsonObjMatch) {
        const obj = JSON.parse(jsonObjMatch[0])
        if (obj && Array.isArray(obj.route_points)) return coerce(obj.route_points)
      }
    } catch (_) {}
    return []
  }

  // 仅在生成完成后再渲染地图与正文，避免内容被反复修改
  const textForMap = result
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

            {/* 内容区：在最终结果出现前，始终显示占位提示 */}
            {!result && (
              <Paper elevation={3} sx={{ p: 3, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Box sx={{
                  height: 160,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                  bgcolor: '#fafafa',
                  border: '1px dashed #e0e0e0',
                  borderRadius: 2
                }}>
                  <CircularProgress size={22} sx={{ mr: 1.5 }} />
                  <Typography variant="body2">旅游规划加载中…</Typography>
                </Box>
              </Paper>
            )}

            {result && (
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
                  dangerouslySetInnerHTML={{ __html: formatResult(result) }}
                />
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
