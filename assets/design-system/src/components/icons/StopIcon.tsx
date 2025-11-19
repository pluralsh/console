import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      fill="none"
      height="14.404"
      rx="2.329"
      stroke={color}
      strokeMiterlimit="10"
      width="14.404"
      x=".7982"
      y=".7982"
    />
  </svg>
))
