import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 17"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      fill="none"
      stroke={color}
      strokeLinejoin="round"
    >
      <rect
        height="2.333333"
        rx=".309027"
        strokeLinecap="round"
        width="9.957315"
        x="3.021342"
        y="1.5"
      />
      <path d="m12.02156075 3.83333334v7.64510994c0 2.22104445-1.80051227 4.02155672-4.02155672 4.02155672-2.22105249 0-4.02156477-1.80051227-4.02156477-4.02155672v-7.64510994" />
      <g strokeLinecap="round">
        <path d="m3.978439 5.392995h2.149183" />
        <path d="m3.978439 9.299137h2.149183" />
        <path d="m3.978439 7.346066h1.563383" />
        <path d="m3.978439 11.252209h1.563383" />
      </g>
    </g>
  </svg>
))
