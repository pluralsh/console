import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_1441_596)">
      <path
        d="M0.5 12.9001V5.30015C0.5 4.80015 0.9 4.40015 1.4 4.40015H16"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M15.5 6.40015V13.9001C15.5 14.4001 15.1 14.8001 14.6 14.8001H0"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3.6001 12.9001V4.6001"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M12.3999 12.9001V4.6001"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M5.7998 2.4001V1.1001C5.7998 0.800098 5.9998 0.600098 6.2998 0.600098H10.2998"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_1441_596">
        <rect
          width={size}
          height={size}
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
