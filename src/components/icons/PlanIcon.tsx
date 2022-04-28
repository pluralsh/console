import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M3.3 13.6H0.5V5.99998C0.5 5.79998 0.7 5.59998 0.9 5.59998H3.7V13.1C3.7 13.4 3.5 13.6 3.3 13.6Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M9.20039 13.6001H6.40039V6.0001C6.40039 5.8001 6.60039 5.6001 6.80039 5.6001H9.60039V13.1001C9.60039 13.4001 9.40039 13.6001 9.20039 13.6001Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.0002 13.6001H12.2002V6.0001C12.2002 5.8001 12.4002 5.6001 12.6002 5.6001H15.4002V13.1001C15.5002 13.4001 15.3002 13.6001 15.0002 13.6001Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M3.7002 2.40002H12.3002"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
