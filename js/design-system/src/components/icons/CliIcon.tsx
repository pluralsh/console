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
      <path d="m.6111 2.1537 5.477 5.61-5.477 5.932" />
      <path d="m7.7356 13.6956h8.021" />
    </g>
  </svg>
))
