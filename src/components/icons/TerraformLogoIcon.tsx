import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 15 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.0529 8.24839L9.73453 10.7393V5.7548L14.0529 3.2586V8.24839Z"
      fill={color}
      stroke={color}
      strokeWidth="0.0549999"
    />
    <path
      d="M4.85333 3.20929L9.22667 5.73729V10.7853L4.85333 8.25996M0 5.44129L4.37333 7.96663V2.91596L0 0.390625M4.85333 13.8653L9.22667 16.3906V11.34L4.85333 8.81463"
      fill={color}
    />
  </svg>
))
