import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M8.4999 12.4001L6.8999 14.5001C6.2999 15.3001 5.0999 15.5001 4.2999 14.8001L0.899902 12.2001L5.2999 6.50005C5.8999 5.70005 7.0999 5.50005 7.8999 6.20005L9.2999 7.20005"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M7.3001 3.90005L9.1001 1.50005C9.7001 0.70005 10.9001 0.50005 11.7001 1.20005L15.1001 3.80005L10.7001 9.50005C10.1001 10.3001 8.9001 10.5001 8.1001 9.80005L6.6001 8.60005"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
