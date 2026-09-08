import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7 16.3933C3.66664 16.3933 0 12.8119 0 8.39331C0 3.97506 3.66664 0.393311 7 0.393311V5.39331H5V11.3933H7V16.3933ZM8.5 16.3933C12.2577 16.3933 16 12.3933 16 8.39331C16 4.39331 12.2244 0.393311 8.5 0.393311V6.89331H6.5V9.89331H8.5V16.3933Z"
      fill={color}
    />
  </svg>
))
