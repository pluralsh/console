import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_570)">
      <path
        d="M2.3999 2.9V1.9C2.3999 1.1 2.9999 0.5 3.7999 0.5H14.2999"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M2.3999 4.90005V14.2C2.3999 15 2.8999 15.6 3.5999 15.6H13.5999V6.20005C13.5999 5.40005 13.0999 4.80005 12.3999 4.80005H2.3999V4.90005Z"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M10.0001 10.2L6.6001 8.19995V12.2L10.0001 10.2Z"
        fill={color}
      />
      <path
        d="M12.6001 0.599976V4.99998"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_570">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
