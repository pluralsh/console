import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_641)">
      <path
        d="M3.7998 0V15.1"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.1998 11.1L3.7998 15.1L0.299805 11.1"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.89941 3H15.9994"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.89941 7.5H15.9994"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M10.7002 11.9H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_641">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
