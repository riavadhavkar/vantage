// OWNER: Person B
// Renders an AI-generated image. The AiBadge is part of the component on purpose:
// there is no prop to hide it, so a generated image cannot appear unlabeled.
import { useState } from 'react'
import GradeLayers from './GradeLayers.jsx'
import AiBadge from './AiBadge.jsx'

export default function GradedImage({ src, grade, alt = '', shouldPan = false, onError, onLoad, badgeClassName = '' }) {
  const [isLoaded, setIsLoaded] = useState(false)
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 ${shouldPan ? 'ken-burns' : ''}`}>
        <img
          src={src}
          alt={alt}
          onLoad={() => {
            setIsLoaded(true)
            onLoad?.()
          }}
          onError={onError}
          className="print-gray absolute inset-0 h-full w-full object-cover"
          decoding="async"
        />
        <GradeLayers grade={grade} />
      </div>
      {isLoaded && <AiBadge kind="image" className={`absolute z-20 ${badgeClassName || 'right-3 bottom-3'}`} />}
    </div>
  )
}
