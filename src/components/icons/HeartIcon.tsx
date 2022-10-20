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
        d="m13.8964 3.2461v-1.953h-5.079v1.953h-1.64v-1.953h-5.08v1.953h-1.474v4.914h1.474v1.799h1.64v1.474h1.64v1.8h1.64v1.474h1.965v-1.474h1.64v-1.8h1.64v-1.474h1.64v-1.799h1.474v-4.914h-1.474z"
        fill="none"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
  </svg>
))
