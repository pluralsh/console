import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="14.597112"
        cy="8"
        r="1.002888"
        strokeWidth=".9"
      />
      <path d="m5.246907 6.336887h5.506185v3.326226h-5.506185z" />
      <path d="m5.246907 1.010661h5.506185v3.326226h-5.506185z" />
      <circle
        cx="1.402888"
        cy="8"
        r="1.002888"
        strokeWidth=".9"
      />
      <path
        d="m5.246907 11.663113h5.506185v3.326226h-5.506185z"
        transform="matrix(-1 0 -0 -1 16 26.652452)"
      />
      <g strokeWidth=".8">
        <path d="m10.75309256 2.673774h2.29359759v3.35070079" />
        <path d="m10.753093 8h1.335967" />
        <path d="m5.24690744 2.673774h-2.29359759v3.35070079" />
        <path d="m5.246907 8h-1.335967" />
        <path d="m5.24690744 13.32622602h-2.29359759v-3.35070079" />
        <path d="m10.75309256 13.32622602h2.29359759v-3.35070079" />
      </g>
    </g>
  </svg>
))
