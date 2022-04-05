import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_519_280)">
      <path
        d="M6.9002 4.5H5.2002V1C5.2002 0.7 5.4002 0.5 5.7002 0.5H7.5002V4C7.5002 4.3 7.2002 4.5 6.9002 4.5Z"
        fill={color}
      />
      <path
        d="M0 2.5H6.3"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M9.2002 2.5H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3.7 10H2V6.5C2 6.2 2.2 6 2.5 6H4.3V9.5C4.3 9.8 4 10 3.7 10Z"
        fill={color}
      />
      <path
        d="M0 8H3.1"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M6 8H16"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M11.0002 15.5H9.2002V12C9.2002 11.7 9.4002 11.5 9.7002 11.5H11.5002V15C11.5002 15.3 11.3002 15.5 11.0002 15.5Z"
        fill={color}
      />
      <path
        d="M0 13.5H10.4"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M13.2998 13.5H15.9998"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_280">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))

