import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="8"
      cy="8"
      r="7.5"
      stroke={color}
    />
    <path
      d="M8.65332 3.80762L4.90332 7.55762L4.46191 8L4.90332 8.44238L8.65332 12.1924L9.53809 11.3076L6.23047 8L9.53809 4.69238L8.65332 3.80762Z"
      fill={color}
    />
  </svg>
))
