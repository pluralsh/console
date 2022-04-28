import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <g clipPath="url(#clip0_519_399)">
      <path
        d="M0.7 10.4C0.3 10.4 0 10.7 0 11.1V16H15.3C15.7 16 16 15.7 16 15.3V10.4H0.7ZM2.8 14.3C2.2 14.3 1.7 13.8 1.7 13.2C1.7 12.6 2.2 12.1 2.8 12.1C3.4 12.1 3.9 12.6 3.9 13.2C3.8 13.8 3.4 14.3 2.8 14.3ZM5.9 14.3C5.3 14.3 4.8 13.8 4.8 13.2C4.8 12.6 5.3 12.1 5.9 12.1C6.5 12.1 7 12.6 7 13.2C7 13.8 6.5 14.3 5.9 14.3Z"
        fill={color}
      />
      <path
        d="M2.7998 4.80002L5.5998 7.60002C5.8998 7.90002 6.4998 7.90002 6.7998 7.60002L13.9998 0.400024"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_399">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
