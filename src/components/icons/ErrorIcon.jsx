import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM7.4 3.1H8.7V9.4H7.4V3.1ZM8 12.9C7.5 12.9 7.1 12.5 7.1 12C7.1 11.5 7.5 11 8 11C8.5 11 8.9 11.4 8.9 11.9C8.9 12.4 8.5 12.9 8 12.9Z"
      fill={color}
    />
  </svg>
))
