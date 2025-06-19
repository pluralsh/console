import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="0.5"
      y="0.5"
      width="19"
      height="19"
      rx="9.5"
      stroke={color}
    />
    <path
      d="M14.6729 6.5791L8.58203 14.25L5.33203 11L5.75 10.582L8.54395 13.376L8.89258 12.9346L14.2051 6.2041L14.6729 6.5791Z"
      fill={color}
      stroke={color}
    />
  </svg>
))
