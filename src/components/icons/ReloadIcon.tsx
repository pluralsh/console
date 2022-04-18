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
      d="M5.5 0.5L8.4 3.4L5.5 6.3"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M7.7 3.30005H3.6C2.7 3.30005 2 4.00005 2 4.90005V15.1H12.2C13.1 15.1 13.8 14.4 13.8 13.5V3.40005H11.1"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

