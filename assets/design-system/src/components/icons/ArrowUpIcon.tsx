import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7.48926 0.49292C7.78234 0.202826 8.25494 0.203535 8.54688 0.494873L14.0605 5.99878L13.001 7.0603L12.4697 6.53101L8.75 2.81714L8.75 15.4167L7.25 15.4167L7.25 2.84253L2.99512 7.0603L1.93945 5.99487L7.48926 0.49292Z"
      fill={color}
    />
  </svg>
))
