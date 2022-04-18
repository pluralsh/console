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
      d="M0 15.5H6.6"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8.6001 15.5H14.7001"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0 8H10.2"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M12.2002 8H15.8002"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0 11.8H2.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M4.5 11.8H12.2"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0 0.5H5.1"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M7.1001 0.5H12.2001"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0 4.19995H13"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

