import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_221)">
      <path
        d="M0.5 7.30005V10.6C0.5 11.7 1.4 12.7 2.6 12.7H7.2"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M10.2002 2H12.1002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M11.6 5.30005H0"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M8.7002 12.6C11.4002 12.6 13.5002 10.4 13.5002 7.79998V2.89998C13.5002 2.39998 13.9002 2.09998 14.3002 2.09998H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M5.9002 10.6C6.28679 10.6 6.6002 10.2866 6.6002 9.89995C6.6002 9.51335 6.28679 9.19995 5.9002 9.19995C5.5136 9.19995 5.2002 9.51335 5.2002 9.89995C5.2002 10.2866 5.5136 10.6 5.9002 10.6Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_221">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
