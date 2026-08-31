import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_342)">
      <path
        d="M5.59961 16V12.7C5.59961 12.3 5.89961 12 6.29961 12H10.4996V16"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M1.5 11V13.1C1.5 13.6 1.8 14.1 2.2 14.4L4.1 15.6"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3.8002 0.199951V2.59995C3.8002 2.89995 3.7002 3.29995 3.4002 3.49995L2.2002 4.69995"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M12.2998 0.199951V2.59995C12.2998 2.89995 12.3998 3.29995 12.6998 3.49995L13.9998 4.79995"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M10.9002 1.19995L9.6002 2.29995C8.7002 3.09995 7.3002 3.09995 6.4002 2.29995L5.2002 1.19995"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M14.2998 5.80005C14.2998 8.10005 11.4998 10 8.0998 10C4.6998 10 1.7998 8.10005 1.7998 5.80005"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_342">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
