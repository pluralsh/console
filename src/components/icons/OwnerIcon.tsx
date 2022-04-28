import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.7998 0V3.2"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8.8998 1.80005L6.7998 3.70005L4.7998 1.80005"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6.8001 10.2C8.01512 10.2 9.0001 9.21508 9.0001 8.00005C9.0001 6.78502 8.01512 5.80005 6.8001 5.80005C5.58507 5.80005 4.6001 6.78502 4.6001 8.00005C4.6001 9.21508 5.58507 10.2 6.8001 10.2Z"
      fill={color}
    />
    <path
      d="M7.7002 12.2H10.7002C11.5002 12.2 12.1002 11.6 12.1002 10.8V6.09998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M3.6001 16V13.2C3.6001 12.6 4.1001 12.2 4.6001 12.2H6.0001"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M10.1001 14.2V16"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
