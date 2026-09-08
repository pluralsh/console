import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14.72 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7.36 0L5.085 4.61L0 5.345L3.68 8.935L2.81 14L7.36 11.61L11.91 14L11.04 8.935L14.72 5.35L9.635 4.61L7.36 0Z"
      fill={fullColor ? '#FFF9C2' : color}
    />
  </svg>
))
