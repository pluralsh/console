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
    >
      <circle
        cx="3"
        cy="3"
        r="1.75"
      />
      <circle
        cx="13"
        cy="13"
        r="1.75"
      />
      <path d="m3 4.75v6.25a2 2 0 0 0 2 2h3.5" />
      <path d="m7.25 11.75 1.25 1.25-1.25 1.25" />
      <path d="m13 11.25v-6.25a2 2 0 0 0 -2-2h-3.5" />
      <path d="m8.75 4.25-1.25-1.25 1.25-1.25" />
    </g>
  </svg>
))
