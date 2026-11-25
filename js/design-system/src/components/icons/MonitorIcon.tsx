import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      fill="none"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    >
      <rect
        x="0.5"
        y="1.5"
        width="15"
        height="10"
        rx="1.5"
      />
      <path d="m8 11.5v3" />
      <path d="m4.5 14.5h7" />
    </g>
  </svg>
))
