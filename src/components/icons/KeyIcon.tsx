import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_519_403)">
      <path
        d="M11.6002 0.199951C9.2002 0.199951 7.2002 2.19995 7.2002 4.59995C7.2002 6.99995 9.2002 8.99995 11.6002 8.99995C14.0002 8.99995 16.0002 6.99995 16.0002 4.59995C16.0002 2.19995 14.0002 0.199951 11.6002 0.199951ZM11.6002 6.09995C10.7002 6.09995 10.0002 5.39995 10.0002 4.49995C10.0002 3.59995 10.8002 2.99995 11.6002 2.99995C12.5002 2.99995 13.2002 3.69995 13.2002 4.59995C13.2002 5.49995 12.5002 6.09995 11.6002 6.09995Z"
        fill={color}
      />
      <path
        d="M0.5 15.3L1 12.5C1 12.4 1.1 12.3 1.2 12.2L6.3 7.09998"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M5.3002 11.4L4.7002 14.9C4.6002 15.2 4.4002 15.4 4.1002 15.4L2.2002 15"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M8.9998 9.59998L8.5998 11.9C8.4998 12.2 8.2998 12.4 7.9998 12.4L6.7998 12.2"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_403">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))

