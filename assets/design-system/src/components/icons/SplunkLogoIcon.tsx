import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.396 11.93V0l53.207 26.698V37.49L5.396 64V52.26L46.675 32z"
      fill={fullColor ? '#65A637' : color}
    />
  </svg>
))
