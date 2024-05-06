import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.03479 0L1 4.09266L4.06434 5.87598L8.03479 3.56664L12.9357 6.41832V12.1229L8.96636 14.4334V18L16 13.9062V4.635L8.03479 0Z"
      fill={color}
    />
    <path
      d="M4.92156 11.0012V16.334L8 18V9.33406L0 5V8.33423L4.92156 11.0012Z"
      fill={color}
    />
  </svg>
))
