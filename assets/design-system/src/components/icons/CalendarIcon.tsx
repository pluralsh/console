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
      strokeWidth=".762"
    >
      <rect
        height="14.064"
        rx="1.339"
        width="15.239"
        x=".38"
        y="1.555"
      />
      <path
        d="m4.8.385v2.282"
        strokeLinecap="round"
      />
      <path
        d="m11.2.385v2.282"
        strokeLinecap="round"
      />
      <path d="m.375 5.75h15.245" />
    </g>
  </svg>
))
