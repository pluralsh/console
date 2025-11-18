import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1.2002 15.5H9.8002C11.2002 15.5 12.3002 14.4 12.3002 13V2.69995"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M14.8002 0.5H6.2002C4.8002 0.5 3.7002 1.6 3.7002 3V13.3"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6 4.59998H10"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6 7.80005H8.7"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6 11H10"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
