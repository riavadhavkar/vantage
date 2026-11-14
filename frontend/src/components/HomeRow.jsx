// OWNER: Person B
// A horizontal row of cards with snap scrolling, edge fades, and arrow buttons on desktop.
import { useRef } from 'react'

export default function HomeRow({ title, children }) {
  const track = useRef(null)
  const scroll = (dir) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section aria-label={title} className="group/row relative">
      <h2 className="mb-3 px-4 text-lg font-semibold tracking-[-0.01em] text-print sm:px-12">{title}</h2>
      <div className="relative">
        <div
          ref={track}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 py-4 [scrollbar-width:none] sm:scroll-px-12 sm:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
        {['left', 'right'].map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => scroll(side === 'left' ? -1 : 1)}
            aria-label={side === 'left' ? `Scroll ${title} back` : `Scroll ${title} forward`}
            className={`absolute inset-y-4 z-20 hidden w-12 items-center justify-center bg-prussian/60 text-print opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:flex ${
              side === 'left' ? 'left-0 rounded-r-md' : 'right-0 rounded-l-md'
            }`}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={side === 'left' ? 'M12.5 4l-6 6 6 6' : 'M7.5 4l6 6-6 6'} />
            </svg>
          </button>
        ))}
      </div>
    </section>
  )
}
