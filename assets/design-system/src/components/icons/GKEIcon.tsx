import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_5020_600)">
      <path
        d="M8.2999 4.09995V0.699951H7.6999V4.19995L4.8999 5.79995L7.9999 7.49995L11.0999 5.69995L8.2999 4.09995Z"
        fill={fullColor ? '#7CADF9' : color}
      />
      <path
        d="M13.9999 11.1999L11.3999 9.6999V6.3999L8.3999 8.1999V11.7999L11.1999 10.1999L13.7999 11.6999L13.9999 11.1999Z"
        fill={fullColor ? '#1467F0' : color}
      />
      <path
        d="M7.60005 8.1999L4.50005 6.3999V9.5999L1.80005 11.1999L2.10005 11.6999L4.80005 10.0999L7.60005 11.6999V8.1999Z"
        fill={fullColor ? '#3381F4' : color}
      />
      <path
        d="M14.9001 12V4L8.0001 0L1.1001 4V12L8.0001 16L14.9001 12ZM8.0001 14.2L2.6001 11.1V4.9L8.0001 1.8L13.4001 4.9V11.1L8.0001 14.2Z"
        fill={fullColor ? '#7CADF9' : color}
      />
    </g>
    <defs>
      <clipPath id="clip0_5020_600">
        <rect
          width="16"
          height="16"
          fill="white"
        />
      </clipPath>
    </defs>
  </svg>
))
