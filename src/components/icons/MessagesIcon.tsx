import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_522)">
      <path
        d="M0.5 13.5V5.30002C0.5 4.50002 1.1 3.90002 1.9 3.90002H10.3"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M15.5 8.09998V11.6C15.5 12.4 14.9 13 14.1 13H2.5"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M11.6 7.20007L8.8 9.20007C8.3 9.50007 7.6 9.50007 7.2 9.20007L3.5 6.70007"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M14.2004 6.00002C15.1945 6.00002 16.0004 5.19414 16.0004 4.20002C16.0004 3.20591 15.1945 2.40002 14.2004 2.40002C13.2063 2.40002 12.4004 3.20591 12.4004 4.20002C12.4004 5.19414 13.2063 6.00002 14.2004 6.00002Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_522">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
