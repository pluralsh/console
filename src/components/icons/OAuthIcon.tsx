import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M8 15.5C12.1421 15.5 15.5 12.1421 15.5 8C15.5 3.85786 12.1421 0.5 8 0.5C3.85786 0.5 0.5 3.85786 0.5 8C0.5 12.1421 3.85786 15.5 8 15.5Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8.2002 10.1H9.3002L9.8002 11.8C9.9002 12.3 10.3002 12.6 10.8002 12.6C11.5002 12.6 12.0002 11.9 11.8002 11.2L9.8002 4.80005"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M9.5002 3.30005H7.5002C7.0002 3.30005 6.6002 3.60005 6.5002 4.00005L4.2002 11.2C4.0002 11.9 4.5002 12.6 5.2002 12.6C5.7002 12.6 6.1002 12.3 6.2002 11.8L6.7002 10.1"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
