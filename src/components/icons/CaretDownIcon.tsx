import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 12 6"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.99998 6L0.803833 0H11.1961L5.99998 6Z"
      fill={color}
    />
  </svg>

))
