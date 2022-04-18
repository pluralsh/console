import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M0.5 9.09995L5.5 14.2L15.4 1.69995"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
  </svg>
))
