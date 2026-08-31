import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_tuning_icon)">
      <path
        d="M12 15V12.95C13.15 12.7 14 11.7 14 10.5C14 9.3 13.15 8.3 12 8.05V1H11V8.05C9.85 8.3 9 9.3 9 10.5C9 11.7 9.85 12.7 11 12.95V15H12ZM10 10.5C10 9.65 10.65 9 11.5 9C12.35 9 13 9.65 13 10.5C13 11.35 12.35 12 11.5 12C10.65 12 10 11.35 10 10.5Z"
        fill={color}
      />
      <path
        d="M4 1V3.05C2.85 3.3 2 4.3 2 5.5C2 6.7 2.85 7.7 4 7.95V15H5V7.95C6.15 7.7 7 6.7 7 5.5C7 4.3 6.15 3.3 5 3.05V1H4ZM6 5.5C6 6.35 5.35 7 4.5 7C3.65 7 3 6.35 3 5.5C3 4.65 3.65 4 4.5 4C5.35 4 6 4.65 6 5.5Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_tuning_icon">
        <rect
          width="16"
          height="16"
          fill="white"
        />
      </clipPath>
    </defs>
  </svg>
))
