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
      d="M6.49961 14.1H0.599609V3.10005C0.599609 2.70005 0.999609 2.30005 1.39961 2.30005H7.29961V13.3C7.29961 13.7 6.89961 14.1 6.49961 14.1Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.2992 6.60005H11.1992V2.50005C11.1992 2.10005 11.4992 1.80005 11.8992 1.80005H15.9992V6.00005C15.9992 6.30005 15.6992 6.60005 15.2992 6.60005Z"
      fill={color}
    />
    <path
      d="M15.2992 14.6001H11.1992V10.4001C11.1992 10.0001 11.4992 9.70007 11.8992 9.70007H15.9992V14.0001C15.9992 14.3001 15.6992 14.6001 15.2992 14.6001Z"
      fill={color}
    />
    <path
      d="M9.2998 4.20007H13.1998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M9.2998 12.2001H13.1998"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

