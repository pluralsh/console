import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x={0.5}
      y={0.5}
      width={15}
      height={15}
      rx={3}
      stroke={color}
    />
    <path
      d="M7.34668 12.1924L11.0967 8.44238L11.5381 8L11.0967 7.55762L7.34668 3.80762L6.46191 4.69238L9.76953 8L6.46191 11.3076L7.34668 12.1924Z"
      fill={color}
    />
  </svg>
))
