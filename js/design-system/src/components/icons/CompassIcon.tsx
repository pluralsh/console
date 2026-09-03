import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="7.99993"
      cy="8"
      r="7.29029"
      transform="rotate(-178.436 7.99993 8)"
      stroke={color}
    />
    <path
      d="M6.60965 6.88442L11.2111 3.99996L9.32513 9.04008L4.65292 11.7632L6.60965 6.88442Z"
      stroke={color}
      strokeWidth="0.5"
    />
    <path
      d="M6.60986 6.88451L11.1635 4.08836L9.32534 9.04017L6.60986 6.88451Z"
      fill={color}
    />
  </svg>
))
