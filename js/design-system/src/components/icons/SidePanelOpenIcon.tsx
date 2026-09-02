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
      d="M2 2H14C14.55 2 15 2.45 15 3V13C15 13.55 14.55 14 14 14H2C1.45 14 1 13.55 1 13V3C1 2.45 1.45 2 2 2ZM11 13H14V3H11V13ZM2 13H10V8.5H4.9L6.7 10.3L6 11L3 8L6 5L6.7 5.7L4.9 7.5H10V3H2V13Z"
      fill={color}
    />
  </svg>
))
