import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <g clipPath="url(#clip0_519_518)">
      <path
        d="M11.3998 5.89998C11.3998 2.99998 8.9998 0.599976 6.0998 0.599976C3.1998 0.599976 0.799805 2.99998 0.799805 5.89998C0.799805 8.79998 3.1998 11.2 6.0998 11.2C8.9998 11.2 11.3998 8.79998 11.3998 5.89998Z"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M15.8998 14.2L14.0998 16L10.6998 12.6C10.4998 12.4 10.4998 12.1 10.6998 12L12.4998 10.2L15.8998 13.6C15.9998 13.8 15.9998 14 15.8998 14.2Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_518">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
