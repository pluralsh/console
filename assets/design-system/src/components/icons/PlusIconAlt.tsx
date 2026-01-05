import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
  >
    <path
      d="M0 7H7M14 7H7M7 7V0M7 7V14"
      stroke={color}
      strokeWidth="1"
    />
  </svg>
))
