/** Servo logo from /brand. `white` for dark backgrounds, `ink` for light pages. */
export default function ServoLogo({
  variant = 'ink',
  kind = 'wordmark',
  className = 'h-8',
}: {
  variant?: 'ink' | 'white'
  kind?: 'wordmark' | 'mark'
  className?: string
}) {
  // Only these files are shipped: white wordmark, ink wordmark, ink mark.
  const file =
    kind === 'mark'
      ? 'servo_mark_ink_transparent.svg'
      : `servo_wordmark_${variant}_transparent.svg`
  // Size by height by default; a caller that sets a width (e.g. `w-full`) owns the sizing.
  const sizing = /(^|\s)w-/.test(className) ? '' : 'w-auto '
  return <img src={`/brand/${file}`} alt="Servo" className={`${sizing}${className}`} />
}
