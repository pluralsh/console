import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      stroke={color}
      strokeLinejoin="round"
      strokeMiterlimit="10"
    >
      <path d="m2 2 12 12" />
      <path d="m2 14 12-12" />
    </g>
  </svg>
))
