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
      d="M7 9.70508L3 13.7051L1 11.7051L1.70508 11L3 12.2949L6.29492 9L7 9.70508ZM15 12L8 12L8 11L15 11L15 12ZM7 2.70508L3 6.70508L1 4.70508L1.70508 4L3 5.29492L6.29492 2L7 2.70508ZM15 5L8 5L8 4L15 4L15 5Z"
      fill={color}
    />
  </svg>
))
