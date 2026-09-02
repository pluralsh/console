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
      <path d="m3.2418.6897h3.156v14.621h-3.156z" />
      <path d="m9.602.69h3.156v14.621h-3.156z" />
    </g>
  </svg>
))
