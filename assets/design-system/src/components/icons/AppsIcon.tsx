import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      fill="none"
      stroke={color}
      strokeMiterlimit="10"
    >
      <rect
        height="6.7"
        rx=".75"
        width="6.7"
        x="8.6939"
        y=".6061"
      />
      <rect
        height="6.7"
        rx=".75"
        width="6.7"
        x="8.6939"
        y="8.6939"
      />
      <rect
        height="6.7"
        rx=".75"
        width="6.7"
        x=".6061"
        y=".6061"
      />
      <rect
        height="6.7"
        rx=".75"
        width="6.7"
        x=".6061"
        y="8.6939"
      />
    </g>
  </svg>
))
