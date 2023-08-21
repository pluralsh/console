import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m2.591 8c0-3.145 2.549-5.694 5.694-5.694s5.694 2.549 5.694 5.694-2.549 5.694-5.694 5.694c-1.572 0-2.996-.637-4.026-1.668"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeWidth=".982"
    />
    <path
      d="m3.127 10.579c-.117.173-.372.173-.489 0l-2.424-3.598c-.132-.196.008-.459.244-.459h4.847c.236 0 .376.264.244.459l-2.424 3.598z"
      fill={color}
    />
    <path
      d="m11.113 10.828-2.828-2.828v-3.629"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeWidth=".932"
    />
  </svg>
))
