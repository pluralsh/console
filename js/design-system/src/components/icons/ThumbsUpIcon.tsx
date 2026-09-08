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
      <path
        d="m3.1604 7.174h-2c-.3 0-.6.3-.6.6v6.6c0 .3.2.5.5.5h2.1c.3 0 .5-.2.5-.5v-6.6c.1-.3-.2-.6-.5-.6z"
        strokeWidth=".89"
      />
      <path
        d="m4.8604 8.374v5.8h.9s5.3 1.8 7.6.5c0 0 .7-.3 1.1-1.1l.8-5.5s.6-1.9-2-1.7l-2.5.4s.6-1.9.9-2.4c1-1.8 1.6-4.4-1-3.2-.5.4-2.8 4.5-2.8 4.5s-1.1 1.8-1.8 2c-.8.2-1.2.3-1.2.7z"
        strokeWidth="1.04"
      />
    </g>
  </svg>
))
