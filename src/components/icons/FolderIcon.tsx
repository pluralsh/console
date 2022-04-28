import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M0 1.30005H5.5C5.8 1.30005 6 1.60005 6 1.90005V4.40005"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8 3.90002H14.9C15.2 3.90002 15.5 4.20002 15.5 4.50002V15.3"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.5 3.40002V14.1C0.5 14.4 0.8 14.7 1.1 14.7H13.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M2.5 6.40002H15.5"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
