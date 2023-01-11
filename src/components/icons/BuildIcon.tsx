import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_1441_192)">
      <path
        d="M14.2001 3H0.600098"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M14.2001 0.5H0.600098"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M6.7002 3V16"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3.3999 16V3"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M12.8999 3V6.9"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M13.8998 8.9999H11.2998V6.3999C11.2998 6.0999 11.4998 5.8999 11.7998 5.8999H14.3998V8.4999C14.3998 8.7999 14.1998 8.9999 13.8998 8.9999Z"
        fill={color}
      />
      <path
        d="M14.7 13.5C14.7 14.5 13.9 15.3 12.9 15.3C11.9 15.3 11 14.5 11 13.5C11 12.5 11.8 11.7 12.8 11.7V10.5"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_1441_192">
        <rect
          width={size}
          height={size}
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
