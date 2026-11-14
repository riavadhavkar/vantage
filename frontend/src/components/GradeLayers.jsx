// OWNER: Person B
// Duotone over a grayscale print: highlight via multiply, shadow via lighten.
export default function GradeLayers({ grade }) {
  return (
    <>
      <div aria-hidden="true" className="grade-hi absolute inset-0" style={{ backgroundColor: grade.highlight }} />
      <div aria-hidden="true" className="grade-lo absolute inset-0" style={{ backgroundColor: grade.shadow }} />
    </>
  )
}
