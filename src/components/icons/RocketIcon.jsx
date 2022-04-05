import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_519_497)">
      <path
        d="M15.5001 1.30005L14.9001 5.40005C14.7001 6.40005 14.1001 7.30005 13.2001 7.80005L10.7001 9.10005L9.6001 9.60005"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M13.2002 1.70007L11.4002 2.00007C10.4002 2.20007 9.5002 2.80007 9.0002 3.70007L7.2002 7.20007"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M11.9 5.70002C12.3971 5.70002 12.8 5.29708 12.8 4.80002C12.8 4.30297 12.3971 3.90002 11.9 3.90002C11.4029 3.90002 11 4.30297 11 4.80002C11 5.29708 11.4029 5.70002 11.9 5.70002Z"
        fill={color}
      />
      <path
        d="M2.6001 8.3001L3.7001 7.5001C4.0001 7.2001 4.4001 7.1001 4.8001 7.3001L5.4001 7.5001"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M8.5 14.2L9.3 13.1C9.5 12.8 9.6 12.4 9.5 12L9.3 11.4"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M5.5 11.6001L4.8 12.3001L4 11.4001C3.9 11.3001 3.8 11.3001 3.7 11.4001L0.7 14.4001L0 15.1001L0.7 15.8001L1.4 15.1001L2.3 16.0001C2.4 16.1001 2.5 16.1001 2.6 16.0001L5.6 13.0001L6.3 12.3001L5.5 11.6001Z"
        fill={color}
      />
      <path
        d="M6.6001 10.2001L8.1001 8.70007"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_497">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))

