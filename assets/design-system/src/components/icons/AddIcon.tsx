import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1.5 6H6M10.5 6H6M6 6V1.5M6 6V10.5"
      stroke={color}
    />
  </svg>
))
