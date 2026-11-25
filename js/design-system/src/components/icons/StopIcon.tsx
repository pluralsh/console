import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      fill={color}
      height="12"
      rx="2"
      width="12"
      x="2"
      y="2"
    />
  </svg>
))
