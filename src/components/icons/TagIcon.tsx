import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_672)">
      <path
        d="M15.5002 3.09998L15.4002 7.49998L8.3002 14.6C7.7002 15.2 6.8002 15.2 6.2002 14.6L2.2002 10.6"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M0.399902 9.60003L8.4999 1.50002C8.7999 1.20002 9.1999 1.00002 9.5999 1.00002L15.9999 0.900024"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M12.0999 5.59995C12.7626 5.59995 13.2999 5.06269 13.2999 4.39995C13.2999 3.73721 12.7626 3.19995 12.0999 3.19995C11.4372 3.19995 10.8999 3.73721 10.8999 4.39995C10.8999 5.06269 11.4372 5.59995 12.0999 5.59995Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_672">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
