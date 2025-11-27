import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m13.5637 8.7572-10.601 6.61c-.429.267-.913-.167-.913-.819v-13.097c0-.651.484-1.086.913-.819l10.601 6.486c.515.317.515 1.322 0 1.639z"
      fill="none"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
