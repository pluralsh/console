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
      d="M8.9998 15.5H1.7998V5.59995C1.7998 5.09995 2.1998 4.69995 2.6998 4.69995H9.8998V14.6C9.8998 15.1 9.4998 15.5 8.9998 15.5Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5.7998 2.6V1.4C5.7998 0.9 6.1998 0.5 6.6998 0.5H13.8998V10.4C13.8998 10.9 13.4998 11.3 12.9998 11.3H11.8998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5.7998 6.80005V11.4H7.8998"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

