import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <g clipPath="url(#clip0_519_509)">
      <path
        d="M1.7002 13.1V8.4C1.7002 7.9 2.1002 7.5 2.6002 7.5H14.8002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M8 13.1V1.69995"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M14.2998 13.1V9.09998"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M1.7 16C2.63888 16 3.4 15.2389 3.4 14.3C3.4 13.3611 2.63888 12.6 1.7 12.6C0.761116 12.6 0 13.3611 0 14.3C0 15.2389 0.761116 16 1.7 16Z"
        fill={color}
      />
      <path
        d="M14.2996 16C15.2385 16 15.9996 15.2389 15.9996 14.3C15.9996 13.3611 15.2385 12.6 14.2996 12.6C13.3607 12.6 12.5996 13.3611 12.5996 14.3C12.5996 15.2389 13.3607 16 14.2996 16Z"
        fill={color}
      />
      <path
        d="M7.9998 16C8.93869 16 9.6998 15.2389 9.6998 14.3C9.6998 13.3611 8.93869 12.6 7.9998 12.6C7.06092 12.6 6.2998 13.3611 6.2998 14.3C6.2998 15.2389 7.06092 16 7.9998 16Z"
        fill={color}
      />
      <path
        d="M7.9998 3.4C8.93869 3.4 9.6998 2.63888 9.6998 1.7C9.6998 0.761116 8.93869 0 7.9998 0C7.06092 0 6.2998 0.761116 6.2998 1.7C6.2998 2.63888 7.06092 3.4 7.9998 3.4Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_509">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
