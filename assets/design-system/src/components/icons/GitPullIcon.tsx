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
        cx="13.1359"
        cy="12.6787"
        r="2.333"
      />
      <circle
        cx="2.8641"
        cy="12.6787"
        r="2.333"
      />
      <path d="m10.8092 12.6786h-5.612" />
      <circle
        cx="2.8642"
        cy="3.3214"
        r="2.333"
      />
      <path d="m5.1974 3.3277h5.612l3.596 3.633" />
      <path d="m14.3998 4.131v2.805h-2.801" />
    </g>
  </svg>
))
