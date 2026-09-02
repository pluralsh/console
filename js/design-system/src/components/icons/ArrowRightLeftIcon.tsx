import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      stroke={color}
      strokeMiterlimit="10"
    >
      <path
        clipPath="none"
        d="m15.932834 11.494422h-15.0999998"
      />
      <path
        clipPath="none"
        d="m4.8327342 14.894422-4-3.4 4-3.4999952"
      />
      <path
        clipPath="none"
        d="m.067166 4.5055782h15.1"
      />
      <path
        clipPath="none"
        d="m11.167266 1.1055782 4 3.4-4 3.499995"
      />
    </g>
  </svg>
))
