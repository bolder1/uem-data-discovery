// A 3D globe (cobe, WebGL) that spins in and settles on the last location —
// the "where in the world is it" view before you zoom into streets.
import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import type { LatLng } from '@/data/deviceLocation'

/** cobe's rotation for a point to face the viewer. */
const anglesFor = ({ lat, lng }: LatLng) => [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180] as const

export function LocationGlobe({ point, warn }: { point: LatLng; warn: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvas.current!
    const size = c.offsetWidth
    const [targetPhi, targetTheta] = anglesFor(point)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Turn in over ~1.4s, by the clock rather than per frame: a paused or
    // throttled tab still lands on the device the moment it draws again.
    const start = performance.now()
    const DURATION = reduce ? 0 : 1400
    const ease = (t: number) => 1 - (1 - t) ** 3
    const globe = createGlobe(c, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: targetPhi - (reduce ? 0 : 2.2),
      theta: targetTheta * 0.8,
      dark: 0,
      diffuse: 3,
      mapSamples: 20000,
      mapBrightness: 1.2,
      baseColor: [1, 1, 1],
      markerColor: warn ? [0.94, 0.27, 0.27] : [0.15, 0.39, 0.92],
      glowColor: [1.15, 1.15, 1.2],
      markers: [{ location: [point.lat, point.lng], size: 0.1 }],
      onRender: (state) => {
        const t = DURATION ? Math.min((performance.now() - start) / DURATION, 1) : 1
        state.phi = targetPhi - 2.2 * (1 - ease(t))
        state.theta = targetTheta * 0.8
        state.width = size * 2
        state.height = size * 2
      },
    })
    return () => globe.destroy()
  }, [point, warn])

  return <canvas ref={canvas} className="aspect-square h-full max-h-full w-auto max-w-full" aria-label="Globe centred on the device's last location" />
}
