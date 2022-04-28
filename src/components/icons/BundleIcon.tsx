import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M0.5 13V2.1C0.5 1.2 1.2 0.5 2.1 0.5H16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.5 3V13.9C15.5 14.8 14.8 15.5 13.9 15.5H0"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8 0.5V15.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.5 8H13"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M11.5 4.80005L8 8.30005L4.5 4.80005"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
