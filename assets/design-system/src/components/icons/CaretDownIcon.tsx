import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 9 5"
    fill="none"
  >
    <path
      d="M0.353546 0.353516L4.10355 4.10352L7.85355 0.353516"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
