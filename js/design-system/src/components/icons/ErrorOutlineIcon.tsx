import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="0.5"
      y="0.5"
      width="9"
      height="9"
      rx="2.5"
      stroke={color}
    />
    <rect
      x="5.40039"
      y="6.09448"
      width="0.819672"
      height="3.7"
      transform="rotate(-180 5.40039 6.09448)"
      fill={color}
    />
    <circle
      cx="4.99068"
      cy="7.65206"
      r="0.57377"
      transform="rotate(-180 4.99068 7.65206)"
      fill={color}
    />
  </svg>
))
