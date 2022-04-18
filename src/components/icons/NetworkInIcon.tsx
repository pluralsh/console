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
      d="M1.7002 0V6.3C1.7002 6.8 2.1002 7.2 2.6002 7.2H14.8002"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M7.90039 0V12.8"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M14.2002 0V5.6"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M7.89961 15.7L10.2996 12.4H5.59961L7.89961 15.7Z"
      fill={color}
    />
  </svg>
))

