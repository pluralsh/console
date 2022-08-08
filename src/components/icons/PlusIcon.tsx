import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m2 8h6m6 0h-6m0 0v-6m0 6v6"
      stroke={color}
      strokeWidth="2"
    />
  </svg>
))
