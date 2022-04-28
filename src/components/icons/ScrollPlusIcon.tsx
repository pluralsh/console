import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_116)">
      <path
        d="M0 3H6"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3 6V0"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M2.40039 15.5H11.0004C12.4004 15.5 13.5004 14.4 13.5004 13V2.69995"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M4.90039 7.30005V13.3"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M16.0004 0.5H7.40039"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.09961 4.59998H11.1996"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.09961 7.80005H9.89961"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.09961 11H11.1996"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_116">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>

))
