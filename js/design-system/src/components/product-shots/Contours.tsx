import { CONTOUR_GROUP, CONTOUR_PATHS } from './contourPaths'

export function Contours({
  color,
  width,
  height,
}: {
  color: string
  width: number
  height: number
}) {
  return (
    <svg
      aria-hidden="true"
      height={height}
      style={{ left: 0, position: 'absolute', top: 0 }}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <g
        fill="none"
        stroke={color}
        strokeWidth={CONTOUR_GROUP.strokeWidth}
        transform={`scale(${width / CONTOUR_GROUP.frameWidth}) translate(${CONTOUR_GROUP.x} ${CONTOUR_GROUP.y})`}
      >
        {CONTOUR_PATHS.map((d) => (
          <path
            d={d}
            key={d}
          />
        ))}
      </g>
    </svg>
  )
}
