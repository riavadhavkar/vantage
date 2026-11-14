// OWNER: Person B
// Cards for the home rows. They grow on hover and focus; reduced motion turns that off.
import { motion } from 'motion/react'
import GradeLayers from './GradeLayers.jsx'

const lift = { whileHover: { scale: 1.06, zIndex: 10 }, whileFocus: { scale: 1.06, zIndex: 10 }, transition: { type: 'spring', stiffness: 320, damping: 26 } }

function Thumb({ scene, grade, children }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-developer">
      <img src={scene} alt="" draggable="false" className="print-gray absolute inset-0 h-full w-full object-cover" />
      {grade && <GradeLayers grade={grade} />}
      <div className="absolute inset-0 bg-gradient-to-t from-prussian/80 via-transparent to-transparent" />
      {children}
    </div>
  )
}

export function TopicCard({ item, onOpen }) {
  return (
    <motion.button type="button" {...lift} onClick={onOpen} className="relative w-[78vw] shrink-0 snap-start text-left sm:w-[420px]">
      <Thumb scene={item.hero} grade={item.heroGrade}>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-xl font-semibold tracking-[-0.02em] text-print">{item.title}</p>
          <p className="mt-1 text-xs text-print/80">
            {[item.year, `${item.perspectives.length} points of view`, `${item.disagreementCount} disagreements`].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Thumb>
    </motion.button>
  )
}

export function PerspectiveCard({ perspective, topicTitle, onOpen }) {
  return (
    <motion.button type="button" {...lift} onClick={onOpen} className="relative w-[58vw] shrink-0 snap-start text-left sm:w-[260px]">
      <Thumb scene={perspective.scene} grade={perspective.grade}>
        <span className="absolute top-2 left-2 h-2 w-2 rounded-full" style={{ backgroundColor: perspective.grade.text }} aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-sm font-semibold text-print">{perspective.label}</p>
        </div>
      </Thumb>
      <p className="mt-2 text-xs text-fog">
        {topicTitle} · {perspective.sourceCount} {perspective.sourceCount === 1 ? 'source' : 'sources'}
      </p>
    </motion.button>
  )
}

export function DisagreementCard({ example, onOpen }) {
  return (
    <motion.button type="button" {...lift} onClick={onOpen} className="relative w-[78vw] shrink-0 snap-start text-left sm:w-[340px]">
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-developer">
        <img src={example.scene} alt="" draggable="false" className="print-gray absolute inset-0 h-full w-full object-cover" />
        <GradeLayers grade={example.b.grade} />
        <div className="absolute inset-0" style={{ clipPath: 'inset(0 50% 0 0)' }}>
          <img src={example.scene} alt="" draggable="false" className="print-gray absolute inset-0 h-full w-full object-cover" />
          <GradeLayers grade={example.a.grade} />
        </div>
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-safelight shadow-[0_0_12px_rgb(210_64_47/0.6)]" />
        <span className="absolute bottom-2 left-2 rounded-full bg-prussian/70 px-2 py-0.5 text-[11px] text-print">{example.a.label}</span>
        <span className="absolute right-2 bottom-2 rounded-full bg-prussian/70 px-2 py-0.5 text-[11px] text-print">{example.b.label}</span>
      </div>
      <p className="mt-2 text-sm leading-[20px] text-print">{example.claim}</p>
      <p className="mt-0.5 text-xs text-fog">{example.topic}</p>
    </motion.button>
  )
}
