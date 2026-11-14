// OWNER: Person B
// Lazy-loaded. A dark map with the scene's place. Falls back to a drawn chart when
// tiles cannot load, and always in demo or offline mode (no network calls there).
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { COLORS } from '../constants/theme.js'

// Free OpenStreetMap tiles (no key). They are light, so src/index.css darkens the tile layer to
// match the stage; markers and labels sit above it and keep their own colors.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function DrawnChart({ location, travelFrom }) {
  const pts = [travelFrom, location].filter(Boolean)
  const lats = pts.map((p) => p.lat)
  const lngs = pts.map((p) => p.lng)
  const pad = 0.6
  const [minLat, maxLat] = [Math.min(...lats) - pad, Math.max(...lats) + pad]
  const [minLng, maxLng] = [Math.min(...lngs) - pad, Math.max(...lngs) + pad]
  const x = (lng) => ((lng - minLng) / (maxLng - minLng)) * 100
  const y = (lat) => 100 - ((lat - minLat) / (maxLat - minLat)) * 100
  const fmt = (v, pos, neg) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`
  return (
    <div className="relative h-full w-full">
      <svg viewBox="-10 -10 120 120" className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Chart showing ${location.label}`}>
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} stroke={COLORS.print} strokeOpacity="0.08" strokeWidth="0.3">
            <line x1={i * 20} y1="0" x2={i * 20} y2="100" />
            <line x1="0" y1={i * 20} x2="100" y2={i * 20} />
          </g>
        ))}
        {travelFrom && (
          <line x1={x(travelFrom.lng)} y1={y(travelFrom.lat)} x2={x(location.lng)} y2={y(location.lat)} stroke={COLORS.fog} strokeWidth="0.6" strokeDasharray="2 2" />
        )}
        {travelFrom && <circle cx={x(travelFrom.lng)} cy={y(travelFrom.lat)} r="1.4" fill="none" stroke={COLORS.fog} strokeWidth="0.5" />}
        <circle cx={x(location.lng)} cy={y(location.lat)} r="2" fill={COLORS.fiber} />
        <text x={x(location.lng) + 3.5} y={y(location.lat) + 1.2} fontSize="3.6" fill={COLORS.print} fontFamily="Hanken Grotesk Variable, sans-serif">
          {location.label}
        </text>
        {travelFrom && (
          <text x={x(travelFrom.lng) + 3} y={y(travelFrom.lat) + 1.2} fontSize="3" fill={COLORS.fog} fontFamily="Hanken Grotesk Variable, sans-serif">
            {travelFrom.label}
          </text>
        )}
      </svg>
      <p className="absolute bottom-2 left-3 text-xs text-fog">
        Drawn chart. {fmt(location.lat, 'N', 'S')}, {fmt(location.lng, 'E', 'W')}
      </p>
    </div>
  )
}

export default function StoryMap({ location, travelFrom, isOffline }) {
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
    L.marker(here, { icon, title: location.label, keyboard: false }).addTo(map).bindTooltip(location.label, { permanent: true, direction: 'right', className: 'map-label', offset: [10, 0] })
    if (travelFrom) {
      const from = [travelFrom.lat, travelFrom.lng]
      L.polyline([from, here], { color: COLORS.fog, weight: 1.5, dashArray: '4 6' }).addTo(map)
      L.circleMarker(from, { radius: 4, color: COLORS.fog, weight: 1, fillOpacity: 0 }).addTo(map)
      map.fitBounds([from, here], { padding: [60, 60], maxZoom: 9 })
    } else {
      // Wide enough that a place at sea still shows a coastline for context.
      map.setView(here, 5)
    }
    // The sheet changes height (full view, phone rotation). Leaflet must be told, or new area stays empty.
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(el.current)
    return () => {
      resize.disconnect()
      map.remove()
    }
  }, [location, travelFrom, useChart])

  if (!location) {
    return <p className="p-6 text-sm text-fog">This part of the story has no place on the map. Choose a scene with a location to see it here.</p>
  }
  if (useChart) return <DrawnChart location={location} travelFrom={travelFrom} />
  return <div ref={el} className="h-full w-full" aria-label={`Map showing ${location.label}`} role="region" />
}
