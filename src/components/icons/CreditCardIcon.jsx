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
      d="M13.3 5.40002H0.5V7.50002H13.3V5.40002Z"
      fill={color}
    />
    <path
      d="M0.5 10.5V3.99998C0.5 3.49998 0.9 3.09998 1.4 3.09998H16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.4 5.40002V12C15.4 12.5 15 12.9 14.5 12.9H0"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5 10H2.5"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

