// OWNER: Person B
// Renders an AI-generated image. The label lives in the player HUD (AiBadge, derived from
// imageStatus === 'ready'), so a generated image is never on stage without it.
// Shown in color (not the duotone used for drawn scenes), with a faint tint
// in the perspective's highlight color.

export default function GradedImage({ src, grade, alt = '', shouldPan = false, onError, onLoad }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 ${shouldPan ? 'ken-burns' : ''}`}>
        <img
          src={src}
          alt={alt}
          onLoad={() => {
            onLoad?.()
          }}
          onError={onError}
          className="print-color absolute inset-0 h-full w-full object-cover"
          decoding="async"
        />
        {grade && <div aria-hidden="true" className="grade-tint absolute inset-0" style={{ backgroundColor: grade.highlight }} />}
      </div>
    </div>
  )
}
