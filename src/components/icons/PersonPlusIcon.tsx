import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_519_107)">
      <path
        d="M4.7002 15.9999V12.1999C4.7002 11.4999 5.3002 10.8999 6.0002 10.8999H13.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M15.5002 10.3999V14.1999C15.5002 14.8999 14.9002 15.4999 14.2002 15.4999H7.2002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M10.1006 8.19995C11.7574 8.19995 13.1006 6.85681 13.1006 5.19995C13.1006 3.5431 11.7574 2.19995 10.1006 2.19995C8.44373 2.19995 7.10059 3.5431 7.10059 5.19995C7.10059 6.85681 8.44373 8.19995 10.1006 8.19995Z"
        fill={color}
      />
      <path
        d="M0.0996094 2.5H5.19961"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M2.7002 5.1V0"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_107">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
