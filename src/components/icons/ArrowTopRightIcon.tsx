import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.25 15.25V6.75H8.75"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 7L6.75 17.25"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>

))
