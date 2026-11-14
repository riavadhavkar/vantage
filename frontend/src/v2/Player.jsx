// The new player. Built up component by component; this first version only proves the route.
import { Aperture } from 'lucide-react'

export default function Player({ session, onExit }) {
  return (
    <main className="v2-player">
      <header className="v2-bar">
        <button type="button" className="v2-brand" onClick={onExit} aria-label="Vantage. Start a new topic">
          <Aperture aria-hidden="true" size={20} strokeWidth={1.6} />
          Vantage
        </button>
      </header>
      <h2 style={{ padding: 24 }}>{session.currentSegment?.title}</h2>
    </main>
  )
}
