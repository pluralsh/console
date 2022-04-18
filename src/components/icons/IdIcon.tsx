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
      d="M0 13.5H14.6C15.1 13.5 15.5 13.1 15.5 12.6V3.80005"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M16 1.80005H1.4C0.9 1.80005 0.5 2.20005 0.5 2.70005V11.5"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M6.2 9.10005H2.5V4.80005C2.5 4.50005 2.7 4.30005 3 4.30005H6.7V8.60005C6.7 8.90005 6.4 9.10005 6.2 9.10005Z"
      fill={color}
    />
    <path
      d="M8.7998 4.80005H13.0998"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M8.7998 7.59998H12.1998"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M8.7998 10.4H13.0998"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
  </svg>
))

