import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_1441_510)">
      <path
        d="M4.6001 10.0998V2.1998C4.6001 1.3998 5.2001 0.799805 6.0001 0.799805H10.0001C10.8001 0.799805 11.4001 1.3998 11.4001 2.1998V9.9998"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3.3001 6.8999C2.6001 6.8999 2.1001 7.3999 2.1001 8.0999V15.9999H12.6001C13.3001 15.9999 13.8001 15.4999 13.8001 14.7999V6.8999H3.3001ZM9.0001 12.6999C9.0001 12.7999 8.9001 12.7999 8.9001 12.7999H7.6001V13.3999H7.0001V10.0999C7.0001 9.9999 7.1001 9.9999 7.1001 9.9999H8.4001V9.3999H9.0001V12.6999Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_1441_510">
        <rect
          width={size}
          height={size}
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
