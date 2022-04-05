import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_519_626)">
      <path
        d="M3.7998 16V0.900024"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.1998 4.90002L3.7998 0.900024L0.299805 4.90002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.89941 13H15.9994"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.89941 8.5H15.9994"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M10.7002 4H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_626">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))

