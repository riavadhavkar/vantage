// The map for the new UI. Same behavior as the classic StoryMap (OpenStreetMap tiles when live,
// a drawn chart in demo or offline mode, no network there), plus one piece of motion: when a
// scene says the story travelled from one place to another, the marker makes that journey
// along the line. It only happens when the data has travel_from; nothing is inferred.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion } from 'motion/react'
import { DURATION, EASING } from '../constants/theme.js'
import { ms, sec, useCalmMotion } from '../lib/motionMode.js'
import './map.css'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const DIM = '#C6CDD5'
const TEXT = '#F3F5F6'
const PAPER = '#EFEDE6'
const easeMove = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function DrawnChart({ location, travelFrom, isCalm }) {
  const pts = [travelFrom, location].filter(Boolean)
  const lats = pts.map((p) => p.lat)
  const lngs = pts.map((p) => p.lng)
  const pad = 0.6
  const [minLat, maxLat] = [Math.min(...lats) - pad, Math.max(...lats) + pad]
  const [minLng, maxLng] = [Math.min(...lngs) - pad, Math.max(...lngs) + pad]
  const x = (lng) => ((lng - minLng) / (maxLng - minLng)) * 100
  const y = (lat) => 100 - ((lat - minLat) / (maxLat - minLat)) * 100
  const fmt = (v, pos, neg) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`
  const to = { cx: x(location.lng), cy: y(location.lat) }
  const from = travelFrom ? { cx: x(travelFrom.lng), cy: y(travelFrom.lat) } : to
  const travel = { duration: sec(isCalm ? 0 : DURATION.slow), delay: sec(isCalm ? 0 : DURATION.panel), ease: EASING.move }
  return (
    <div className="v2-chart">
      <svg viewBox="-10 -10 120 120" preserveAspectRatio="xMidYMid meet" role="img" aria-label={travelFrom ? `Chart showing the way from ${travelFrom.label} to ${location.label}` : `Chart showing ${location.label}`}>
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} stroke={TEXT} strokeOpacity="0.08" strokeWidth="0.3">
            <line x1={i * 20} y1="0" x2={i * 20} y2="100" />
            <line x1="0" y1={i * 20} x2="100" y2={i * 20} />
          </g>
        ))}
        {travelFrom && (
          <>
            {/* row 45: the line draws ahead of the marker */}
            <motion.line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} stroke={DIM} strokeWidth="0.6" pathLength="1" strokeDasharray="1" initial={{ strokeDashoffset: isCalm ? 0 : 1 }} animate={{ strokeDashoffset: 0 }} transition={travel} />
            <circle cx={from.cx} cy={from.cy} r="1.4" fill="none" stroke={DIM} strokeWidth="0.5" />
            <text x={from.cx + 3} y={from.cy + 1.2} fontSize="3" fill={DIM}>{travelFrom.label}</text>
          </>
        )}
        <motion.circle r="2" fill={PAPER} initial={isCalm ? to : from} animate={to} transition={travel} />
        <motion.text x={to.cx + 3.5} y={to.cy + 1.2} fontSize="3.6" fill={TEXT} initial={{ opacity: travelFrom && !isCalm ? 0 : 1 }} animate={{ opacity: 1 }} transition={{ duration: sec(DURATION.panel), delay: travel.delay + travel.duration * 0.8 }}>
          {location.label}
        </motion.text>
      </svg>
      <p>Drawn chart. {fmt(location.lat, 'N', 'S')}, {fmt(location.lng, 'E', 'W')}</p>
    </div>
  )
}

export default function TravelMap({ location, travelFrom, isOffline }) {
  const isCalm = useCalmMotion()
  const el = useRef(null)
  const [hasTileError, setHasTileError] = useState(false)
  const useChart = isOffline || hasTileError

  useEffect(() => {
    if (useChart || !location || !el.current) return
    const map = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
    const tiles = L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, subdomains: 'abc', maxZoom: 12 })
    let errors = 0
    tiles.on('tileerror', () => {
      errors += 1
      if (errors > 3) setHasTileError(true)
    })
    tiles.addTo(map)
    const icon = L.divIcon({ className: '', html: '<span class="map-marker"></span>', iconSize: [16, 16], iconAnchor: [8, 8] })
    const here = [location.lat, location.lng]
    let frame = 0
    if (travelFrom) {
      const from = [travelFrom.lat, travelFrom.lng]
      map.fitBounds([from, here], { padding: [60, 60], maxZoom: 9 })
      L.circleMarker(from, { radius: 4, color: DIM, weight: 1, fillOpacity: 0 }).addTo(map)
      const line = L.polyline([from, from], { color: DIM, weight: 1.5, dashArray: '4 6' }).addTo(map)
      const marker = L.marker(isCalm ? here : from, { icon, title: location.label, keyboard: false }).addTo(map)
      marker.bindTooltip(location.label, { permanent: true, direction: 'right', className: 'map-label', offset: [10, 0] })
      if (isCalm) line.setLatLngs([from, here])
      else {
        // row 45: one marker, interpolated along the line, stops when it arrives
        const total = ms(DURATION.slow)
        const startAt = performance.now() + ms(DURATION.panel)
        const step = (now) => {
          const t = Math.min(1, Math.max(0, (now - startAt) / total))
          const k = easeMove(t)
          const at = [from[0] + (here[0] - from[0]) * k, from[1] + (here[1] - from[1]) * k]
          marker.setLatLng(at)
          line.setLatLngs([from, at])
          if (t < 1) frame = requestAnimationFrame(step)
        }
        frame = requestAnimationFrame(step)
      }
    } else {
      L.marker(here, { icon, title: location.label, keyboard: false }).addTo(map).bindTooltip(location.label, { permanent: true, direction: 'right', className: 'map-label', offset: [10, 0] })
      // wide enough that a place at sea still shows a coastline for context
      map.setView(here, 5)
    }
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(el.current)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      map.remove()
    }
  }, [location, travelFrom, useChart, isCalm])

  if (!location) return <p className="v2-map-empty">This part of the story has no place on the map. Choose a scene with a location to see it here.</p>
  if (useChart) return <DrawnChart key={`${location.lat},${location.lng}`} location={location} travelFrom={travelFrom} isCalm={isCalm} />
  return <div ref={el} className="v2-map" aria-label={`Map showing ${location.label}`} role="region" />
}
