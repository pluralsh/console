import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_566)">
      <path
        d="M4.6001 10.1V2.20005C4.6001 1.40005 5.2001 0.800049 6.0001 0.800049H10.0001C10.8001 0.800049 11.4001 1.40005 11.4001 2.20005V4.60005"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3.3001 6.90002C2.6001 6.90002 2.1001 7.40002 2.1001 8.10002V16H12.6001C13.3001 16 13.8001 15.5 13.8001 14.8V6.90002H3.3001ZM9.0001 12.7C9.0001 12.8 8.9001 12.8 8.9001 12.8H7.6001V13.4H7.0001V10.1C7.0001 10 7.1001 10 7.1001 10H8.4001V9.40002H9.0001V12.7Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_566">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
