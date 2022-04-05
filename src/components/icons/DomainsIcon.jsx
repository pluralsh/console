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
      d="M0.5 15.5V10.9C0.5 10.3 1 9.69995 1.7 9.69995H13.5"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M15.5 9.30005V13.9C15.5 14.5 15 15.1 14.3 15.1H2.5"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M14 7.80005C14 4.50005 11.3 1.80005 8 1.80005C4.7 1.80005 2 4.50005 2 7.80005"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M10.6004 7.80005C10.6004 4.50005 9.40039 1.80005 8.00039 1.80005C6.60039 1.80005 5.40039 4.50005 5.40039 7.80005"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M2.5 5.30005H13.4"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M3.4 13.3C3.89706 13.3 4.3 12.8971 4.3 12.4C4.3 11.9029 3.89706 11.5 3.4 11.5C2.90294 11.5 2.5 11.9029 2.5 12.4C2.5 12.8971 2.90294 13.3 3.4 13.3Z"
      fill={color}
    />
    <path
      d="M6.1998 13.3C6.69686 13.3 7.0998 12.8971 7.0998 12.4C7.0998 11.9029 6.69686 11.5 6.1998 11.5C5.70275 11.5 5.2998 11.9029 5.2998 12.4C5.2998 12.8971 5.70275 13.3 6.1998 13.3Z"
      fill={color}
    />
    <path
      d="M8.9 13.3C9.39706 13.3 9.8 12.8971 9.8 12.4C9.8 11.9029 9.39706 11.5 8.9 11.5C8.40294 11.5 8 11.9029 8 12.4C8 12.8971 8.40294 13.3 8.9 13.3Z"
      fill={color}
    />
  </svg>
))

