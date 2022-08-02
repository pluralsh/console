import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill={color}
      d="M8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 3.8466e-07 8 0C3.6 -3.8466e-07 3.8466e-07 3.6 0 8C-3.8466e-07 12.4 3.6 16 8 16ZM7.2 12.8H8.5V6.5H7.2L7.2 12.8ZM8.8 3.9C8.8 3.4 8.4 3 7.9 3C7.4 3 7 3.5 7 4C7 4.5 7.4 4.9 7.9 4.9C8.4 4.9 8.8 4.4 8.8 3.9Z"
    />
  </svg>
))
