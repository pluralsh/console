import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_618)">
      <path
        d="M5.80045 7.5H1.30045C0.800448 7.5 0.400448 8 0.600448 8.5L2.60045 15.6"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M15.9998 9.5H5.7998"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M15.1998 7.5H11.7998V3.8C11.7998 3.4 12.1998 3 12.5998 3H15.9998V6.7C15.9998 7.2 15.5998 7.5 15.1998 7.5Z"
        fill={color}
      />
      <path
        d="M10.7002 1H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M4.5 15.4H14C14.8 15.4 15.5 14.7 15.5 13.9V12.3"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M5.4 13.1C5.89706 13.1 6.3 12.6971 6.3 12.2C6.3 11.703 5.89706 11.3 5.4 11.3C4.90294 11.3 4.5 11.703 4.5 12.2C4.5 12.6971 4.90294 13.1 5.4 13.1Z"
        fill={color}
      />
      <path
        d="M7.99961 13.1C8.49667 13.1 8.89961 12.6971 8.89961 12.2C8.89961 11.703 8.49667 11.3 7.99961 11.3C7.50255 11.3 7.09961 11.703 7.09961 12.2C7.09961 12.6971 7.50255 13.1 7.99961 13.1Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_618">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
