import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M14.2001 3H0.600098"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M14.2001 0.5H0.600098"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6.7002 3V16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M3.3999 16V3"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M12.8999 3V6.9"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M13.8998 9.00002H11.2998V6.40002C11.2998 6.10002 11.4998 5.90002 11.7998 5.90002H14.3998V8.50002C14.3998 8.80002 14.1998 9.00002 13.8998 9.00002Z"
      fill={color}
    />
    <path
      d="M14.7 13.5C14.7 14.5 13.9 15.3 12.9 15.3C11.9 15.3 11 14.5 11 13.5C11 12.5 11.8 11.7 12.8 11.7V10.5"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
