import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_252)">
      <path
        d="M15.3002 16H0.200195V14.2C0.200195 13.9 0.400195 13.7 0.700195 13.7H15.8002V15.5C15.8002 15.7 15.6002 16 15.3002 16Z"
        fill={color}
      />
      <path
        d="M14.4998 3.19995L12.0998 0.799951C11.7998 0.499951 11.2998 0.499951 11.0998 0.799951L3.0998 8.69995L2.7998 11.6L5.6998 11.3L12.2998 4.69995"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_252">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
