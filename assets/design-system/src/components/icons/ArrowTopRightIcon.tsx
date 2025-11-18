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
      strokeMiterlimit="10"
    >
      <path d="M2 14L14 2" />
      <path d="M5.67969 2H13.9997V10.32" />
    </g>
  </svg>
))
