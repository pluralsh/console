import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_519_391)">
      <path
        d="M4.40039 15.5V12.4H9.70039"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
      <path
        d="M0.700195 15.5V12.4H2.8002"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
      <path
        d="M11.0002 9.30005C10.3002 9.30005 9.7002 9.90005 9.7002 10.6V15.6H14.7002C15.4002 15.6 16.0002 15 16.0002 14.3V9.30005H11.0002ZM12.9002 14.1C12.0002 14.1 11.2002 13.3 11.2002 12.4C11.2002 11.5 12.0002 10.7 12.9002 10.7C13.8002 10.7 14.6002 11.5 14.6002 12.4C14.6002 13.3 13.8002 14.1 12.9002 14.1Z"
        fill={color}
      />
      <path
        d="M11.5998 6.69998V3.59998H6.2998"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
      <path
        d="M0 0.5V5.5C0 6.2 0.6 6.8 1.3 6.8H6.3V1.8C6.3 1 5.7 0.5 5 0.5H0ZM1.4 3.6C1.4 2.7 2.2 1.9 3.1 1.9C4 1.9 4.8 2.7 4.8 3.6C4.8 4.5 4 5.3 3.1 5.3C2.2 5.3 1.4 4.5 1.4 3.6Z"
        fill={color}
      />
      <path
        d="M15.3002 6.69998V3.59998H13.2002"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_391">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))

