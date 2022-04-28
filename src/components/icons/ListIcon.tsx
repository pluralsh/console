import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <g clipPath="url(#clip0_519_437)">
      <path
        d="M5.7002 1.59998H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M5.7002 8H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M5.7002 14.4H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M1.6 3.1C0.7 3.1 0 2.4 0 1.6C0 0.7 0.7 0 1.6 0C2.5 0 3.2 0.7 3.2 1.6C3.1 2.4 2.4 3.1 1.6 3.1Z"
        fill={color}
      />
      <path
        d="M1.6 9.60002C0.7 9.60002 0 8.90002 0 8.00002C0 7.10002 0.7 6.40002 1.6 6.40002C2.5 6.40002 3.2 7.10002 3.2 8.00002C3.1 8.90002 2.4 9.60002 1.6 9.60002Z"
        fill={color}
      />
      <path
        d="M1.6 16C0.7 16 0 15.3 0 14.4C0 13.5 0.7 12.8 1.6 12.8C2.5 12.8 3.2 13.5 3.2 14.4C3.1 15.3 2.4 16 1.6 16Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_437">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
