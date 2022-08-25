import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m5 8-.35355-.35355-.35356.35355.35356.35356zm6.3536 5.6464-6.00005-5.99995-.7071.70711 5.99995 6.00004zm-6.00005-5.29285 6.00005-6-.7072-.7071-5.99995 6z"
      fill={color}
    />
  </svg>
))
