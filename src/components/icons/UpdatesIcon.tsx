import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <g clipPath="url(#clip0_519_656)">
      <path
        d="M14.1004 14.1H2.70039C2.30039 14.1 1.90039 13.7 1.90039 13.3V7.09998"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3.8 7.70007H0L1.9 4.70007L3.8 7.70007Z"
        fill={color}
      />
      <path
        d="M8.0002 9.80007C8.99431 9.80007 9.8002 8.99419 9.8002 8.00007C9.8002 7.00596 8.99431 6.20007 8.0002 6.20007C7.00608 6.20007 6.2002 7.00596 6.2002 8.00007C6.2002 8.99419 7.00608 9.80007 8.0002 9.80007Z"
        fill={color}
      />
      <path
        d="M14.1004 9.10002V2.70002C14.1004 2.30002 13.7004 1.90002 13.3004 1.90002H1.90039"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M12.2002 8.30005H16.0002L14.1002 11.3L12.2002 8.30005Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_656">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
