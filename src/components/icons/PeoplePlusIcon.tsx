import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.0996094 2.5H5.19961"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M2.7002 5.1V0"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M4.89961 11.3C6.16986 11.3 7.19961 10.2702 7.19961 8.99995C7.19961 7.7297 6.16986 6.69995 4.89961 6.69995C3.62935 6.69995 2.59961 7.7297 2.59961 8.99995C2.59961 10.2702 3.62935 11.3 4.89961 11.3Z"
      fill={color}
    />
    <path
      d="M8.5 16V14.5C8.5 13.9 8 13.5 7.5 13.5H2"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M11.8996 8.1C13.1699 8.1 14.1996 7.07026 14.1996 5.8C14.1996 4.52975 13.1699 3.5 11.8996 3.5C10.6294 3.5 9.59961 4.52975 9.59961 5.8C9.59961 7.07026 10.6294 8.1 11.8996 8.1Z"
      fill={color}
    />
    <path
      d="M15.5004 13.7V11.3C15.5004 10.7 15.0004 10.3 14.5004 10.3H8.90039"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
