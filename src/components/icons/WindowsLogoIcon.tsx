import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="matrix(.71428571 0 0 .71428571 -.214286 -.214286)">
      <path
        d="m1 1h10v10h-10z"
        fill={fullColor ? '#f35325' : color}
      />
      <path
        d="m12 1h10v10h-10z"
        fill={fullColor ? '#81bc06' : color}
      />
      <path
        d="m1 12h10v10h-10z"
        fill={fullColor ? '#05a6f0' : color}
      />
      <path
        d="m12 12h10v10h-10z"
        fill={fullColor ? '#ffba08' : color}
      />
    </g>
  </svg>
))
