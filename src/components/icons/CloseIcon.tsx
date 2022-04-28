import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.400391 0.5L15.6004 15.5"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M0.5 15.6L15.5 0.400024"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
  </svg>
))
