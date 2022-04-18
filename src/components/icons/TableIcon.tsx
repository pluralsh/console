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
      d="M16 0H0.5V3.6H16V0Z"
      fill={color}
    />
    <path
      d="M16 12.3H1.4C0.9 12.3 0.5 12.7 0.5 13.2V16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M16 7.69995H1.4C0.9 7.69995 0.5 8.09995 0.5 8.59995V10.3"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M12.7002 0V16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6.2002 0V16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.5 0V5.7"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

