// OWNER: Person B
// A small six-blade aperture. Open = this point of view is in focus.
export default function ApertureGlyph({ color = 'currentColor', isOpen = false, size = 20, className = '' }) {
  const r = isOpen ? 5.2 : 2.2
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return `${10 + r * Math.cos(a)},${10 + r * Math.sin(a)}`
  }).join(' ')
  const blades = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    const b = a + Math.PI / 3
    return (
      <line
        key={i}
        x1={10 + r * Math.cos(a)}
        y1={10 + r * Math.sin(a)}
        x2={10 + 9 * Math.cos(b - 0.35)}
        y2={10 + 9 * Math.sin(b - 0.35)}
        stroke={color}
        strokeWidth="1"
        opacity="0.8"
      />
    )
  })
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 20 20" className={`shrink-0 ${className}`}>
      <circle cx="10" cy="10" r="9" fill={isOpen ? 'none' : color} fillOpacity={isOpen ? 0 : 0.18} stroke={color} strokeWidth="1.2" />
      {blades}
      <polygon points={pts} fill={isOpen ? color : 'none'} fillOpacity="0.9" stroke={color} strokeWidth="1" />
    </svg>
  )
}
