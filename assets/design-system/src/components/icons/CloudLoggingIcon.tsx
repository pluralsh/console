import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.5 3L14 3L14 11L2 11L2 8L1 8L1 11C1 11.2652 1.10543 11.5195 1.29297 11.707C1.48051 11.8946 1.73478 12 2 12L6 12L6 14L4 14L4 15L12 15L12 14L10 14L10 12L14 12C14.2652 12 14.5195 11.8946 14.707 11.707C14.8946 11.5195 15 11.2652 15 11L15 3C15 2.73478 14.8946 2.48051 14.707 2.29297C14.5195 2.10543 14.2652 2 14 2L8.5 2L8.5 3ZM9 14L7 14L7 12L9 12L9 14ZM4 6L4 7L7 7L7 6L4 6ZM1 5L7 5L7 4L1 4L1 5ZM1 3L7 3L7 2L1 2L1 3Z"
      fill={color}
    />
  </svg>
))
