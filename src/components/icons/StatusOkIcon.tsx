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
      d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM4.6 8.9C4.1 8.9 3.7 8.5 3.7 8C3.7 7.5 4.1 7.1 4.6 7.1C5.1 7.1 5.5 7.5 5.5 8C5.6 8.5 5.1 8.9 4.6 8.9ZM8 8.9C7.5 8.9 7.1 8.5 7.1 8C7.1 7.5 7.5 7.1 8 7.1C8.5 7.1 8.9 7.5 8.9 8C8.9 8.5 8.5 8.9 8 8.9ZM11.4 8.9C10.9 8.9 10.5 8.5 10.5 8C10.5 7.5 10.9 7.1 11.4 7.1C11.9 7.1 12.3 7.5 12.3 8C12.3 8.5 11.9 8.9 11.4 8.9Z"
      fill={color}
    />
  </svg>
))
