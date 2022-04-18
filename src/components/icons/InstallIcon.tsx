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
      d="M0.7 10.5C0.3 10.5 0 10.8 0 11.2V16H15.2C15.6 16 15.9 15.7 15.9 15.3V10.4H0.7V10.5ZM2.8 14.3C2.2 14.3 1.7 13.8 1.7 13.2C1.7 12.6 2.2 12.1 2.8 12.1C3.4 12.1 3.9 12.6 3.9 13.2C3.9 13.8 3.4 14.3 2.8 14.3ZM6 14.3C5.4 14.3 4.9 13.8 4.9 13.2C4.9 12.6 5.4 12.1 6 12.1C6.6 12.1 7 12.7 7 13.2C7 13.7 6.5 14.3 6 14.3Z"
      fill={color}
    />
    <path
      d="M8 0V8.4"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M12.3002 4.19995L8.0002 8.39995L3.7002 4.19995"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
  </svg>
))

