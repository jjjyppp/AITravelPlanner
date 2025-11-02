import { useEffect, useMemo, useRef, useState } from 'react'

// Simple coordinate parser: "lng, lat" or "lat, lng" (auto-swap if needed)
const parseCoordinate = (value) => {
  if (!value || typeof value !== 'string') return null
  const parts = value.split(',').map((s) => Number(String(s).trim()))
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return null
  const [a, b] = parts
  const swapNeeded = Math.abs(a) <= 60 && Math.abs(b) >= 60 && Math.abs(b) <= 180
  return swapNeeded ? [b, a] : [a, b]
}

// Extract any "x,y" pairs from free text content
const extractCoordinatesFromText = (text) => {
  if (!text) return []
  const regex = /(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/g
  const coords = []
  let m
  while ((m = regex.exec(text))) {
    const lng = Number(m[1])
    const lat = Number(m[2])
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      // Assume input is "lng, lat"; swap if looks like "lat, lng"
      const swapNeeded = Math.abs(lng) <= 60 && Math.abs(lat) >= 60 && Math.abs(lat) <= 180
      coords.push(swapNeeded ? [lat, lng] : [lng, lat])
    }
  }
  return coords
}

// Geocode a list of place strings sequentially to preserve order
const geocodeSequential = async (AMap, places) => {
  if (!places.length) return []
  // Ensure plugin
  await new Promise((resolve) => {
    if (AMap.Geocoder) return resolve()
    if (AMap.plugin) {
      AMap.plugin('AMap.Geocoder', () => resolve())
    } else {
      resolve()
    }
  })

  const geocoder = new AMap.Geocoder({})
  const results = []

  const geocodeOne = (text) => new Promise((resolve) => {
    if (!text) return resolve(null)
    geocoder.getLocation(text, (status, res) => {
      if (status === 'complete' && res && res.geocodes && res.geocodes.length > 0) {
        const loc = res.geocodes[0].location
        resolve([loc.lng, loc.lat])
      } else {
        resolve(null)
      }
    })
  })

  for (const p of places) {
    // Skip duplicates in a row to reduce calls, but keep order
    const last = results.length ? results[results.length - 1] : null
    if (last && typeof p === 'string' && typeof last.source === 'string' && last.source === p) {
      results.push({ point: last.point, source: p })
      continue
    }
    const point = await geocodeOne(p)
    results.push({ point, source: p })
  }

  return results.map((r) => r.point).filter(Boolean)
}

const MapSection = ({ itinerary, apiKey, securityCode }) => {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const polylineRef = useRef(null)
  const labelsRef = useRef([])
  const [selectedDay, setSelectedDay] = useState('all')
  const [mapReady, setMapReady] = useState(false)

  // 从环境变量读取 Key（统一从 env 获取）
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
  const amapKey = env.VITE_AMAP_KEY || ''
  const amapSecurity = env.VITE_AMAP_SECURITY || ''

  const dayActivities = useMemo(() => {
    if (!itinerary || !Array.isArray(itinerary.days)) return []
    const acc = []
    itinerary.days.forEach((day) => {
      if (!Array.isArray(day.activities)) return
      day.activities.forEach((a) => {
        // Prefer explicit a.location; fallback to description parenthesis content
        let loc = a?.location || ''
        if (!loc && typeof a?.description === 'string') {
          const m = a.description.match(/(?:（|\()([^（）()]+?)(?:）|\))/)
          if (m) loc = m[1]
        }
        const dayNumber = Number(day?.day) || Number(day?.index) || undefined
        if (loc) acc.push({ title: a?.description || '行程', location: String(loc), day: dayNumber })
      })
    })
    return acc
  }, [itinerary])

  const availableDays = useMemo(() => {
    // Prefer route_points.day, else dayActivities.day
    const set = new Set()
    if (Array.isArray(itinerary?.route_points) && itinerary.route_points.length) {
      itinerary.route_points.forEach((p) => {
        if (Number.isFinite(Number(p.day))) set.add(Number(p.day))
      })
    } else {
      dayActivities.forEach((i) => {
        if (Number.isFinite(Number(i.day))) set.add(Number(i.day))
      })
    }
    return Array.from(set).sort((a, b) => a - b)
  }, [itinerary, dayActivities])

  useEffect(() => {
    if (!amapKey || !containerRef.current) return

    if (amapSecurity) {
      window._AMapSecurityConfig = { securityJsCode: amapSecurity }
    }

    const loadScript = () => new Promise((resolve, reject) => {
      if (window._amap_loaded) return resolve()
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`
      script.async = true
      script.onload = () => { window._amap_loaded = true; resolve() }
      script.onerror = () => reject(new Error('高德地图脚本加载失败'))
      document.body.appendChild(script)
    })

    loadScript()
      .then(() => {
        if (!window.AMap || !containerRef.current) return
        const AMap = window.AMap
        mapRef.current = new AMap.Map(containerRef.current, {
          zoom: 10,
          viewMode: '2D',
          resizeEnable: true,
        })
        setMapReady(true)
        // 为兼容性暂不添加控件，避免个别环境下控件初始化导致的 getZoom 报错
      })
      .catch((e) => console.error(e))
  }, [amapKey, amapSecurity])

  useEffect(() => {
    const AMap = window.AMap
    if (!AMap || !mapRef.current || !mapReady) return

    // Clear previous
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    labelsRef.current.forEach((l) => l.setMap(null))
    labelsRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    if (!itinerary) return

    const coordinates = []
    const titles = []
    const daysForPoints = []

    // 0) Prefer explicit structured route_points
    if (Array.isArray(itinerary?.route_points) && itinerary.route_points.length) {
      const sorted = itinerary.route_points
        .map((p, i) => {
          let lng, lat
          if (Array.isArray(p) && p.length >= 2) {
            lng = Number(p[0]); lat = Number(p[1])
          } else if (typeof p === 'object') {
            const pos = Array.isArray(p.position) ? p.position : (Array.isArray(p.coord) ? p.coord : null)
            lng = Number(p.lng ?? p.lon ?? p.longitude ?? (pos ? pos[0] : undefined))
            lat = Number(p.lat ?? p.latitude ?? (pos ? pos[1] : undefined))
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
              const loc = typeof p.location === 'string' ? p.location : (typeof p.location_text === 'string' ? p.location_text : '')
              const parts = loc.split(',').map(s => Number(String(s).trim()))
              if (parts.length === 2 && parts.every(Number.isFinite)) { lng = parts[0]; lat = parts[1] }
            }
          }
          return {
            lng,
            lat,
            title: (p && p.title) ? p.title : `第${p?.order || i + 1}站`,
            order: Number.isFinite(Number(p?.order)) ? Number(p.order) : i + 1,
            day: Number.isFinite(Number(p?.day)) ? Number(p.day) : undefined,
          }
        })
        .filter((p) => Number.isFinite(p.lng) && Number.isFinite(p.lat))
        .sort((a, b) => (a.order - b.order))
      sorted.forEach((p) => {
        coordinates.push([p.lng, p.lat])
        titles.push(p.title)
        daysForPoints.push(p.day)
      })
    }

    // 1) Fallback: structured activities with coordinates
    if (coordinates.length === 0) {
      for (const item of dayActivities) {
        const point = parseCoordinate(item.location)
        if (point) {
          coordinates.push(point)
          titles.push(item.title)
          daysForPoints.push(Number.isFinite(Number(item.day)) ? Number(item.day) : undefined)
        }
      }
    }

    // 2) Fallback: extract coordinate pairs from free text
    if (coordinates.length === 0 && itinerary.content) {
      const extracted = extractCoordinatesFromText(itinerary.content)
      extracted.forEach((p) => coordinates.push(p))
    }

    const addMarkersAndPath = (pts, titlesArg) => {
      if (!pts || pts.length === 0) return
      pts.forEach((p, idx) => {
        const markerTitle = titlesArg[idx] || `第${idx + 1}站`
        const marker = new AMap.Marker({ position: p, title: markerTitle })
        marker.setMap(mapRef.current)
        markersRef.current.push(marker)

        // Permanent label next to marker for better readability
        try {
          const text = new AMap.Text({
            text: markerTitle,
            position: p,
            offset: new AMap.Pixel(10, -16),
            style: {
              backgroundColor: 'rgba(255,255,255,0.85)',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '2px 6px',
              color: '#111827',
              fontSize: '12px',
              lineHeight: '16px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
            },
            zIndex: 120
          })
          text.setMap(mapRef.current)
          labelsRef.current.push(text)
        } catch (_) {}
      })
      polylineRef.current = new AMap.Polyline({
        path: pts,
        strokeColor: '#2563eb',
        strokeWeight: 4,
        strokeOpacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      })
      polylineRef.current.setMap(mapRef.current)
      try { mapRef.current.setFitView([...markersRef.current, polylineRef.current], false, [60, 60, 60, 60]) } catch {}
    }

    const tryGeocodeIfNeeded = async () => {
      if (coordinates.length > 0) {
        // 按天过滤
        let pts = coordinates
        let tts = titles
        if (selectedDay !== 'all' && availableDays.length) {
          const filtered = []
          const filteredTitles = []
          coordinates.forEach((p, idx) => {
            if (daysForPoints[idx] === Number(selectedDay)) {
              filtered.push(p)
              filteredTitles.push(titles[idx])
            }
          })
          pts = filtered
          tts = filteredTitles
        }
        addMarkersAndPath(pts, tts)
        return
      }
      // Collect textual locations for geocoding
      const locs = dayActivities.map((i) => i.location).filter(Boolean)
      // Fallback: include destination
      if (itinerary.destination) locs.push(String(itinerary.destination))
      const points = await geocodeSequential(AMap, locs)
      addMarkersAndPath(points, points.map((_, i) => titles[i] || `第${i + 1}站`))
    }

    tryGeocodeIfNeeded()
  }, [itinerary, dayActivities, selectedDay, availableDays, mapReady])

  return (
    <section className="map-section" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>地图概览</h3>
        {!!availableDays.length && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedDay('all')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                background: selectedDay === 'all' ? '#2563eb' : '#fff',
                color: selectedDay === 'all' ? '#fff' : '#111827',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >全部</button>
            {availableDays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #e5e7eb',
                  background: selectedDay === d ? '#2563eb' : '#fff',
                  color: selectedDay === d ? '#fff' : '#111827',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >{`第 ${d} 天`}</button>
            ))}
          </div>
        )}
      </div>
      {!amapKey && <p style={{ marginTop: 0 }}>请在配置中填写高德地图 API Key。</p>}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 380,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          boxShadow: '0 6px 14px rgba(0,0,0,0.06)'
        }}
      />
    </section>
  )
}

export default MapSection
