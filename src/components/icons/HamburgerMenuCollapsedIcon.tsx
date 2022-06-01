import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_1453_9661)">
      <path
        d="M6 3.19995L16 3.19995"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
      <path
        d="M6 12.8L16 12.8"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
      <path
        d="M9 8L16 8"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
      <path
        d="M5 8L5.35355 8.35355L5.70711 8L5.35355 7.64645L5 8ZM0.646446 4.35355L4.64645 8.35355L5.35355 7.64645L1.35355 3.64645L0.646446 4.35355ZM4.64645 7.64645L0.646447 11.6464L1.35355 12.3536L5.35355 8.35355L4.64645 7.64645Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_1453_9661">
        <rect
          width="16"
          height="16"
          fill="white"
          transform="matrix(-1 0 0 1 16 0)"
        />
      </clipPath>
    </defs>
  </svg>

))
